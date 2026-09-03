import "server-only";

// ─── Growth Studio: integracione tačke sa lifecycle-om termina ────────────────
// Jedina API površina koju postojeće rute pozivaju (jedna linija po ruti).
// Nikad ne baca. Dedup preko atomic claim-a na Appointment.loyaltyProcessed
// (pattern kao reminderSent) + unique index na LoyaltyEvent.
//
// Voucher tranzicije se rade i kada je loyalty u međuvremenu isključen —
// rezervisan vaučer mora da se razreši bez obzira na stanje programa.

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { emitLoyaltyEvent, emitLoyaltyEventDurable } from "./events";
import {
  redeemForAppointment,
  releaseForAppointment,
  unRedeemForAppointment,
} from "./vouchers/service";
import { publishReferralCompletionForAppointment } from "./referrals";
import { getAppointmentRealizedValue } from "@/lib/appointments/pricingSnapshot";
import type { IAppointmentPricing } from "@/types";

interface AppointmentLean {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  status?: string;
  clientProfileId?: Types.ObjectId;
  serviceName?: string;
  finalPrice?: number;
  pricing?: IAppointmentPricing;
  services?: Array<{ price?: number; quantity?: number }>;
  appliedVoucherId?: Types.ObjectId;
  loyaltyProcessed?: {
    completed?: boolean;
    noShow?: boolean;
    revertCount?: number;
  };
}

/**
 * Potrošnja na kojoj se dodeljuju bodovi — STVARNA, posle pogodnosti.
 *
 * Redosled (T1-4, Appointment Checkout):
 *   1. `pricing.chargedAmount` — vlasnica je IZRIČITO upisala koliko je
 *      naplatila. To je poslednja reč i nadjačava svaki obračun: ako je
 *      dogovoreno 3.200 a naplaćeno 3.000, poeni idu na 3.000.
 *   2. `finalPrice` — iznos za naplatu posle vaučera, kad stvarno naplaćeno
 *      nije posebno uneto.
 *   3. canonical realized fallback za zatečene termine.
 *
 * Do T1-4 je `finalPrice` bio prvi, pa je uneto „stvarno naplaćeno" gubilo od
 * vaučerske aritmetike. Checkout sada eksplicitno razlikuje „za naplatu" i
 * „stvarno naplaćeno", pa i knjiženje mora.
 *
 * Nepoznata cena daje 0 potrošnje, ne 0 dinara prihoda — bodovi se prosto ne
 * dodeljuju dok se cena ne sazna.
 */
function appointmentSpend(appt: AppointmentLean, status: string): number {
  const charged = appt.pricing?.chargedAmount;
  if (typeof charged === "number") return charged;
  if (typeof appt.finalPrice === "number") return appt.finalPrice;
  // Status se prosleđuje izričito: projekcija ga ne učitava, a `realized`
  // fallback traži dokaz da je usluga izvršena. Kod reverta merodavan je
  // PRETHODNI status — bodovi koji se poništavaju zarađeni su na completed.
  return getAppointmentRealizedValue({ ...appt, status } as never) ?? 0;
}

/**
 * Završetak posete — retry-safe finalizacija loyalty lifecycle-a.
 *
 * ZAŠTO POSTOJI ODVOJENO. Ranije je prvo postavljan `loyaltyProcessed.completed
 * = true` (kao claim protiv dvostruke obrade), pa su TEK ONDA rađeni vaučer i
 * durable događaj — a hook je svaku grešku gutao. Pad posle claim-a ostavljao
 * je trajno neispravno stanje koje niko ne bi popravio:
 *
 *   rezervisan vaučer na završenom terminu, ili
 *   završena poseta bez `appointment_completed` događaja (dakle bez zarade),
 *
 * dok bi svaki sledeći pokušaj video `completed: true` i odustao. Sweeper tu
 * ne pomaže: on retry-uje događaje koji POSTOJE, a ovde događaj nije ni nastao.
 *
 * Sada zastavica znači „finalizacija je durabilno uspostavljena", a ne „počeli
 * smo da pokušavamo". Redosled:
 *
 *   1. vaučer `reserved → redeemed`   (CAS — idempotentno)
 *   2. durable `appointment_completed` (unique sourceId — tačno jednom)
 *   3. referral publish                (idempotentno)
 *   4. TEK ONDA `loyaltyProcessed.completed = true`
 *
 * Svaki korak sme da se ponovi bez posledice, pa ponovni poziv nad već
 * završenim terminom popravlja nedovršenu finalizaciju umesto da je preskoči.
 * Dvostruka zarada nije moguća: nju čuva unique `{tenantId, type, sourceId}`
 * na događaju i idempotency ključ u ledgeru.
 */
export async function finalizeAppointmentCompletion(
  appointmentId: Types.ObjectId | string,
  opts?: { source?: "admin" | "auto" },
): Promise<{ finalized: boolean; alreadyFinalized: boolean }> {
  await connectToDB();
  const id = String(appointmentId);

  const appt = (await Appointment.findById(appointmentId)
    .select(
      "tenantId clientProfileId serviceName status finalPrice pricing services appliedVoucherId loyaltyProcessed",
    )
    .lean()) as AppointmentLean | null;

  // Termin koji nije završen (ili je u međuvremenu vraćen) nema šta da
  // finalizuje — revert putanja ima svoju logiku.
  if (!appt?.clientProfileId || appt.status !== "completed") {
    return { finalized: false, alreadyFinalized: false };
  }
  if (appt.loyaltyProcessed?.completed === true) {
    return { finalized: true, alreadyFinalized: true };
  }

  const cycle = appt.loyaltyProcessed?.revertCount ?? 0;

  // Opisna polja se smeju upisati odmah: ona nisu claim i ne odlučuju ništa.
  await Appointment.updateOne(
    { _id: appointmentId, completedAt: { $in: [null, undefined] } },
    {
      $set: {
        completedAt: new Date(),
        completionSource: opts?.source ?? "admin",
      },
    },
  );

  // 1. Vaučer. CAS na `{reservedAppointmentId, status: "reserved"}` — ponovni
  //    poziv nad već iskorišćenim vaučerom ne radi ništa.
  await redeemForAppointment(id);

  // 2. Durable događaj. Baca ako upis padne — bez njega finalizacija NIJE
  //    gotova i zastavica ne sme da se postavi.
  await emitLoyaltyEventDurable({
    tenantId: appt.tenantId,
    type: "appointment_completed",
    sourceType: "appointment",
    sourceId: `${id}:c${cycle}`,
    subjectTenantUserId: appt.clientProfileId,
    payload: {
      appointmentId: id,
      spend: appointmentSpend(appt, "completed"),
      serviceName: appt.serviceName,
    },
  });

  // 3. Referral (idempotentan, sa sopstvenim gate-om).
  await publishReferralCompletionForAppointment({
    tenantId: appt.tenantId,
    appointmentId: id,
    referredTenantUserId: appt.clientProfileId,
    appliedVoucherId: appt.appliedVoucherId,
    cycle,
  });

  // 4. Tek sada je finalizacija durabilna.
  await Appointment.updateOne(
    { _id: appointmentId, status: "completed" },
    { $set: { "loyaltyProcessed.completed": true } },
  );

  return { finalized: true, alreadyFinalized: false };
}

export async function loyaltyOnAppointmentStatusChange(
  appointmentId: Types.ObjectId | string,
  previousStatus: string,
  newStatus: string,
  opts?: { source?: "admin" | "auto" },
): Promise<void> {
  try {
    if (previousStatus === newStatus) return;
    await connectToDB();

    const appt = (await Appointment.findById(appointmentId)
      .select(
        "tenantId clientProfileId serviceName finalPrice pricing services appliedVoucherId loyaltyProcessed",
      )
      .lean()) as AppointmentLean | null;
    if (!appt?.clientProfileId) return;

    const id = String(appointmentId);

    // ── Revert: completed → bilo šta drugo ──
    if (previousStatus === "completed" && newStatus !== "completed") {
      const claimed = (await Appointment.findOneAndUpdate(
        { _id: appointmentId, "loyaltyProcessed.completed": true },
        {
          $set: { "loyaltyProcessed.completed": false },
          $inc: { "loyaltyProcessed.revertCount": 1 },
        },
        { new: true },
      ).lean()) as AppointmentLean | null;

      if (claimed) {
        const revertCount = claimed.loyaltyProcessed?.revertCount ?? 1;
        const backTo =
          newStatus === "appointment_approved" || newStatus === "pending"
            ? "reserved"
            : "active";
        await unRedeemForAppointment(id, backTo);
        await emitLoyaltyEvent({
          tenantId: appt.tenantId,
          type: "appointment_completion_reverted",
          sourceType: "appointment",
          sourceId: `${id}:r${revertCount}`,
          subjectTenantUserId: appt.clientProfileId,
          payload: {
          appointmentId: id,
          revertCount,
          spend: appointmentSpend(appt, previousStatus),
        },
        });
      }
    }

    // ── Completion ──
    if (newStatus === "completed") {
      await finalizeAppointmentCompletion(appointmentId, opts);
      return;
    }

    // ── No-show ──
    if (newStatus === "no_show") {
      await releaseForAppointment(id);

      // Flag je once-ever: kazna/streak-reset se primenjuje najviše jednom
      // po terminu, i kroz višestruke revert cikluse.
      const claimed = await Appointment.findOneAndUpdate(
        { _id: appointmentId, "loyaltyProcessed.noShow": { $ne: true } },
        { $set: { "loyaltyProcessed.noShow": true } },
      ).lean();
      if (!claimed) return;

      await emitLoyaltyEvent({
        tenantId: appt.tenantId,
        type: "appointment_no_show",
        sourceType: "appointment",
        sourceId: id,
        subjectTenantUserId: appt.clientProfileId,
        payload: { appointmentId: id },
      });
      return;
    }

    // ── Otkazivanje / odbijanje: oslobodi rezervisan vaučer ──
    if (
      newStatus === "appointment_cancelled" ||
      newStatus === "appointment_rejected"
    ) {
      await releaseForAppointment(id);
    }
  } catch (err) {
    console.error("[loyalty] appointment hook failed:", err);
  }
}

/** Registracija klijenta — welcome bonus (ako je konfigurisan). */
export async function loyaltyOnClientRegistered(
  tenantId: Types.ObjectId | string,
  tenantUserId: Types.ObjectId | string,
): Promise<void> {
  try {
    await emitLoyaltyEvent({
      tenantId,
      type: "client_registered",
      sourceType: "tenant_user",
      sourceId: String(tenantUserId),
      subjectTenantUserId: tenantUserId,
    });
  } catch (err) {
    console.error("[loyalty] register hook failed:", err);
  }
}
