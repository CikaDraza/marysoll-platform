/**
 * POST /api/public/[tenantSlug]/appointments/guest
 *
 * Public — no auth required.
 * Creates a GUEST TenantUser profile + Appointment in pending status.
 * The guest is identified by name + phone; email is optional and used
 * for deduplication (re-uses existing profile if email already exists).
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { SalonProfile } from "@/models/SalonProfile";
import { createAppointmentNotification } from "@/lib/notificationService";
import {
  hasGuestBookingContact,
  inferPreferredContact,
  normalizeContactValue,
  normalizeEmail,
  normalizeInstagram,
} from "@/lib/contactRules";
import {
  checkManualSlotAvailability,
  overlapsAppointments,
} from "@/helpers/manualSlots";
import type { IAppointmentService, ManualSlotsMap } from "@/types";
import type { ITenant } from "@/models/Tenant";

type Params = { params: Promise<{ tenantSlug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await connectToDB();

    const { tenantSlug } = await params;

    // ── Resolve tenant ────────────────────────────────────────────────────────
    const tenantDoc = await Tenant.findOne({
      slug: tenantSlug,
      status: "active",
    }).lean();

    if (!tenantDoc) {
      return NextResponse.json(
        { error: "Salon nije pronađen ili nije aktivan." },
        { status: 404 },
      );
    }

    const tenant = tenantDoc as unknown as ITenant;
    const tenantId = tenant._id?.toString();

    // ── Check salon can accept bookings ───────────────────────────────────────
    const now = new Date();
    const trialEndsAt = tenant.trialEndsAt
      ? new Date(tenant.trialEndsAt)
      : null;
    const isTrialActive =
      tenant.isTrialActive && trialEndsAt && trialEndsAt > now;
    const canAcceptBookings =
      tenant.paid === true || isTrialActive === true || tenant.plan === "maria";

    if (!canAcceptBookings) {
      return NextResponse.json(
        { error: "Salon nije aktivan. Zakazivanje nije moguće." },
        { status: 403 },
      );
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const data = await request.json();
    const {
      name,
      phone,
      email,
      instagram,
      tiktok,
      serviceId,
      serviceName,
      services,
      date,
      time,
      duration,
      note,
      preferredContact,
      contactNote,
    } = data;
    const normalizedPhone = normalizeContactValue(phone);
    const normalizedEmail = normalizeEmail(email);
    const normalizedInstagram = normalizeInstagram(instagram);

    // ── Validate required fields ──────────────────────────────────────────────
    if (!name?.trim()) {
      return NextResponse.json({ error: "Ime je obavezno." }, { status: 400 });
    }
    if (!hasGuestBookingContact({ phone, email, instagram })) {
      return NextResponse.json(
        {
          error:
            "Za zakazivanje kao gost unesite telefon, email ili Instagram.",
        },
        { status: 400 },
      );
    }
    if (!serviceId) {
      return NextResponse.json(
        { error: "Nedostaje ID usluge." },
        { status: 400 },
      );
    }
    if (!date || !time) {
      return NextResponse.json(
        { error: "Datum i vreme su obavezni." },
        { status: 400 },
      );
    }

    // ── Validate service exists ───────────────────────────────────────────────
    const service = await Service.findById(serviceId);
    if (!service) {
      return NextResponse.json(
        { error: "Usluga nije pronađena." },
        { status: 404 },
      );
    }
    const salonProfile = await SalonProfile.findOne({ tenantId })
      .select("cancellationWindowHours availabilityMode manualSlots")
      .lean<{
        cancellationWindowHours?: number;
        availabilityMode?: string;
        manualSlots?: ManualSlotsMap;
      }>();
    const cancellationWindowHours =
      typeof salonProfile?.cancellationWindowHours === "number"
        ? salonProfile.cancellationWindowHours
        : 1;

    // ── Check slot availability ───────────────────────────────────────────────
    // Preklapanje po TRAJANJU (oba režima): novi termin [time, time+duration)
    // ne sme da se seče ni sa jednim aktivnim terminom tog dana. Radno vreme se
    // namerno NE proverava — vlasnik pri odobravanju odlučuje da li prima
    // termin koji izlazi van radnog vremena.
    const dayAppointments = await Appointment.find({
      tenantId,
      date,
      status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
    })
      .select("date time duration")
      .lean<{ date: string; time: string; duration?: number }[]>();

    const requestedDuration = Number(duration) || service.duration || 60;
    if (overlapsAppointments(dayAppointments, date, time, requestedDuration)) {
      return NextResponse.json({ error: "Termin je zauzet." }, { status: 400 });
    }

    // manualSlots režim: sme se zakazati SAMO tačan termin koji je vlasnik
    // definisao, i to slobodan (bez preklapanja) — bez obzira šta pošalje UI.
    if (salonProfile?.availabilityMode === "manualSlots") {
      const check = checkManualSlotAvailability(
        salonProfile.manualSlots,
        dayAppointments,
        date,
        time,
      );
      if (!check.ok) {
        return NextResponse.json(
          {
            error:
              check.reason === "taken"
                ? "Termin je zauzet."
                : "Izabrani termin nije dostupan. Izaberite jedan od ponuđenih termina.",
          },
          { status: 400 },
        );
      }
    }

    // ── Find or create GUEST TenantUser ───────────────────────────────────────
    let guestUser = null;
    if (normalizedEmail) {
      // Reuse existing profile (any role) if email matches this tenant
      guestUser = await TenantUser.findOne({
        tenantId: tenant._id,
        email: normalizedEmail,
      });
    }

    if (!guestUser) {
      // Generate a placeholder email for guests who didn't provide one
      const guestEmail =
        normalizedEmail ||
        `guest_${Date.now()}_${crypto.randomBytes(4).toString("hex")}@noemail.guest`;

      // Random placeholder password — guests cannot log in
      const placeholderPassword = await bcrypt.hash(
        crypto.randomBytes(16).toString("hex"),
        10,
      );

      guestUser = await TenantUser.create({
        tenantId: tenant._id,
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

    // ── Create appointment ────────────────────────────────────────────────────
    const resolvedServiceName = serviceName || service.name;

    const appointment = new Appointment({
      tenantId,
      clientProfileId: guestUser._id.toString(),
      clientName: name.trim(),
      clientEmail: guestUser.email,
      clientPhone: normalizedPhone,
      clientInstagram: normalizedInstagram,
      preferredContact:
        preferredContact || inferPreferredContact({ phone, email, instagram }),
      contactNote: contactNote?.trim() ?? "",
      cancellationWindowHours,
      cancellationStatus: "can_cancel",
      serviceName: resolvedServiceName,
      services: (services as IAppointmentService[]).map((s) => ({
        ...s,
        serviceName: s.serviceName,
        duration: s.duration,
      })),
      date,
      time,
      duration: duration || service.duration || 60,
      note: note || undefined,
      status: "pending",
      messages: [],
      adminNotified: true,
      clientNotified: false,
      lastUpdatedBy: "client",
      unreadCount: { client: 0, admin: 0 },
    });

    await appointment.save();

    // ── Notify admin ──────────────────────────────────────────────────────────
    await createAppointmentNotification(
      {
        _id: appointment._id.toString(),
        tenantId: tenant._id,
        clientProfileId: guestUser._id.toString(),
        clientName: name.trim(),
        clientEmail: appointment.clientEmail,
        serviceName: resolvedServiceName,
        date,
        time,
        note: appointment.note,
        clientPhone: appointment.clientPhone,
        clientInstagram: appointment.clientInstagram,
        preferredContact: appointment.preferredContact,
        contactNote: appointment.contactNote,
      },
      "created",
    );

    return NextResponse.json(
      {
        message: "Termin uspešno zakazan. Čeka odobrenje.",
        appointmentId: appointment._id.toString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Guest appointment error:", error);

    // Return Mongoose validation errors as 400 with a readable message
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name: string }).name === "ValidationError" &&
      "errors" in error
    ) {
      const fields = Object.values(
        (error as { errors: Record<string, { message: string }> }).errors,
      )
        .map((e) => e.message)
        .join("; ");
      return NextResponse.json(
        { error: `Validacija nije prošla: ${fields}` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Greška pri kreiranju termina.", details: String(error) },
      { status: 500 },
    );
  }
}
