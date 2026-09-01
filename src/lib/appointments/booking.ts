import "server-only";

/**
 * Deljena booking logika za tri rute koje kreiraju termin:
 *   - POST /api/appointments/create            (ulogovan klijent)
 *   - POST /api/appointments/create-guest      (admin u ime gosta)
 *   - POST /api/public/[tenantSlug]/appointments/guest  (javni gost)
 *
 * Cilj: da provera "sme li salon da prima" i "da li je slot slobodan" i
 * kreiranje GUEST profila NE žive u tri kopije koje se vremenom raziđu
 * (npr. jedna ruta dobije novu proveru, druga zaostane).
 */
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { Types } from "mongoose";
import { Appointment } from "@/models/Appointment";
import { SalonProfile } from "@/models/SalonProfile";
import { TenantUser } from "@/models/TenantUser";
import {
  checkManualSlotAvailability,
  overlapsAppointments,
} from "@/helpers/manualSlots";
import {
  isWithinWorkingHours,
  workingSlotsForDate,
} from "@/helpers/parseWorkingHours";
import type { ManualSlotsMap } from "@/types";
import { ACTIVE_APPOINTMENT_STATUS_FILTER } from "@/lib/appointments/occupancy";

/** Trial/paid gate — sme li salon trenutno da prima zakazivanja. */
export function canAcceptBookings(tenant: {
  paid?: boolean;
  isTrialActive?: boolean;
  trialEndsAt?: Date | string | null;
  plan?: string;
}): boolean {
  const now = new Date();
  const trialEndsAt = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
  const isTrialActive = Boolean(
    tenant.isTrialActive && trialEndsAt && trialEndsAt > now,
  );
  return tenant.paid === true || isTrialActive || tenant.plan === "maria";
}

type BookingSalonProfile = {
  cancellationWindowHours?: number;
  availabilityMode?: string;
  manualSlots?: ManualSlotsMap;
  workingHours?: Record<string, unknown>;
};

/**
 * Učitaj polja SalonProfila potrebna za booking i vrati i normalizovan
 * cancellationWindowHours (default 1h) da rute ne ponavljaju tu proveru.
 */
export async function loadBookingProfile(tenantId: string): Promise<{
  profile: BookingSalonProfile | null;
  cancellationWindowHours: number;
}> {
  const profile = await SalonProfile.findOne({ tenantId })
    .select("cancellationWindowHours availabilityMode manualSlots workingHours")
    .lean<BookingSalonProfile>();
  const cancellationWindowHours =
    typeof profile?.cancellationWindowHours === "number"
      ? profile.cancellationWindowHours
      : 1;
  return { profile, cancellationWindowHours };
}

/**
 * Provera slobodnog termina — jedina istina za oba režima.
 * Preklapanje po TRAJANJU (novi termin [time, time+duration) ne sme da se
 * seče ni sa jednim aktivnim terminom tog dana).
 * `enforceWorkingHours` (KLIJENTSKI tokovi, odluka 2026-07-05): termin mora
 * ceo da stane u radno vreme i dan mora biti radan — ADMIN (create-guest)
 * namerno NIJE ograničen (sme prekovremeno/neradan dan/preklapanje).
 * U manualSlots režimu dodatno: sme samo tačan termin koji je vlasnik definisao.
 * Vraća poruku o grešci (string) ili null ako je slobodno.
 */
export async function checkSlotAvailability(args: {
  tenantId: string;
  date: string;
  time: string;
  requestedDuration: number;
  profile: BookingSalonProfile | null;
  enforceWorkingHours?: boolean;
}): Promise<string | null> {
  const {
    tenantId,
    date,
    time,
    requestedDuration,
    profile,
    enforceWorkingHours,
  } = args;

  if (enforceWorkingHours && profile?.availabilityMode !== "manualSlots") {
    const daySlots = workingSlotsForDate(profile?.workingHours, date);
    if (daySlots.length === 0) {
      return "Salon ne radi izabranog dana.";
    }
    if (
      !isWithinWorkingHours(profile?.workingHours, date, time, requestedDuration)
    ) {
      return "Izabrano vreme je van radnog vremena salona.";
    }
  }

  const dayAppointments = await Appointment.find({
    tenantId,
    date,
    status: ACTIVE_APPOINTMENT_STATUS_FILTER,
  })
    .select("date time duration")
    .lean<{ date: string; time: string; duration?: number }[]>();

  if (overlapsAppointments(dayAppointments, date, time, requestedDuration)) {
    return "Termin je zauzet.";
  }

  if (profile?.availabilityMode === "manualSlots") {
    const check = checkManualSlotAvailability(
      profile.manualSlots,
      dayAppointments,
      date,
      time,
    );
    if (!check.ok) {
      return check.reason === "taken"
        ? "Termin je zauzet."
        : "Izabrani termin nije dostupan. Izaberite jedan od ponuđenih termina.";
    }
  }

  return null;
}

/**
 * Nađi ili kreiraj GUEST TenantUser. Identifikacija po (tenant, email); ako
 * email nije dat, generiše se placeholder @noemail.guest + nasumična lozinka
 * (gost ne može da se uloguje). Vrednosti se očekuju već normalizovane.
 */
export async function findOrCreateGuestUser(input: {
  tenantObjectId: Types.ObjectId;
  name: string;
  normalizedPhone: string;
  normalizedEmail: string;
  normalizedInstagram: string;
  tiktok?: string;
}) {
  const {
    tenantObjectId,
    name,
    normalizedPhone,
    normalizedEmail,
    normalizedInstagram,
    tiktok,
  } = input;

  // Reuse postojećeg GOSTA po email ILI telefonu (manje duplikata). Registrovani
  // se NE prikačuje ovde — signal je prikazan u formi; nastaje nov gost (merge
  // kandidat) da se tuđi nalog ne koristi bez prijave.
  let guestUser = null;
  const guestOr: Record<string, unknown>[] = [];
  if (normalizedEmail) guestOr.push({ email: normalizedEmail });
  if (normalizedPhone) guestOr.push({ phone: normalizedPhone });
  if (guestOr.length > 0) {
    guestUser = await TenantUser.findOne({
      tenantId: tenantObjectId,
      role: "GUEST",
      $or: guestOr,
    });
  }

  if (!guestUser) {
    // Ako email već pripada NEKOM nalogu (npr. registrovani) — ne možemo ga
    // iskoristiti (unique {tenantId,email}) niti se prikačujemo → placeholder.
    let emailForGuest = normalizedEmail;
    if (normalizedEmail) {
      const emailTaken = await TenantUser.exists({
        tenantId: tenantObjectId,
        email: normalizedEmail,
      });
      if (emailTaken) emailForGuest = "";
    }
    const guestEmail =
      emailForGuest ||
      `guest_${Date.now()}_${crypto.randomBytes(4).toString("hex")}@noemail.guest`;
    const placeholderPassword = await bcrypt.hash(
      crypto.randomBytes(16).toString("hex"),
      10,
    );

    guestUser = await TenantUser.create({
      tenantId: tenantObjectId,
      email: guestEmail,
      password: placeholderPassword,
      name: name.trim(),
      phone: normalizedPhone,
      role: "GUEST",
      status: "invited",
      isEmailVerified: false,
      ...(normalizedInstagram && { instagram: normalizedInstagram }),
      ...(tiktok?.trim() && { tiktok: tiktok.trim() }),
    });
  }

  return guestUser;
}
