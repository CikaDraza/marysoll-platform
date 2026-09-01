/**
 * POST /api/public/[tenantSlug]/appointments/guest
 *
 * Public — no auth required.
 * Creates a GUEST TenantUser profile + Appointment in pending status.
 * The guest is identified by name + phone; email is optional and used
 * for deduplication (re-uses existing profile if email already exists).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { Tenant } from "@/models/Tenant";
import { createAppointmentNotification } from "@/lib/notificationService";
import {
  hasGuestBookingContact,
  inferPreferredContact,
  normalizeContactValue,
  normalizeEmail,
  normalizeInstagram,
} from "@/lib/contactRules";
import {
  canAcceptBookings,
  checkSlotAvailability,
  findOrCreateGuestUser,
  loadBookingProfile,
} from "@/lib/appointments/booking";
import type { IAppointmentService } from "@/types";
import type { ITenant } from "@/models/Tenant";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { sanitizeAppointmentRequest } from "@/lib/appointments/intake";
import { getTenantFolder } from "@/lib/cloudinary";

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
    const denied = await requireCapability(tenantId, "booking.services");
    if (denied) return denied;

    // ── Check salon can accept bookings ───────────────────────────────────────
    if (!canAcceptBookings(tenant)) {
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
      request: intakeRequest,
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
    const { profile: salonProfile, cancellationWindowHours } =
      await loadBookingProfile(tenantId!);

    // ── Check slot availability ───────────────────────────────────────────────
    const requestedDuration = Number(duration) || service.duration || 60;
    const slotError = await checkSlotAvailability({
      tenantId: tenantId!,
      date,
      time,
      requestedDuration,
      profile: salonProfile,
      // Klijentski tok: mora u radno vreme (admin create-guest ostaje slobodan)
      enforceWorkingHours: true,
    });
    if (slotError) {
      return NextResponse.json({ error: slotError }, { status: 400 });
    }

    // ── Find or create GUEST TenantUser ───────────────────────────────────────
    const guestUser = await findOrCreateGuestUser({
      tenantObjectId: tenant._id,
      name,
      normalizedPhone,
      normalizedEmail,
      normalizedInstagram,
      tiktok,
    });

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
      // Zahtev iz browsera — nikad se ne upisuje sirov.
      request: sanitizeAppointmentRequest(
        intakeRequest,
        await getTenantFolder(String(tenant._id)),
      ),
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
        request: appointment.request ?? null,
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
