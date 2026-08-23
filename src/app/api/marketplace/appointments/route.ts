/**
 * GET  /api/marketplace/appointments?clientEmail=...&page=1&limit=10
 * POST /api/marketplace/appointments
 *
 * Cross-tenant client appointments endpoint (booking.marysoll.com).
 * Protected by HMAC signature (PLATFORM_API_SECRET) — server-to-server only.
 * GET: identity via clientEmail (extracted from the user's Bearer token by the
 *      calling server). POST: creates a GUEST TenantUser + Appointment for any
 *      salon by salonId — enforcement (radno vreme + overlap + manualSlots) je
 *      UVEK uključen (klijentski tok), za razliku od admin create-guest rute.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { Tenant } from "@/models/Tenant";
import { SalonProfile } from "@/models/SalonProfile";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";
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

export async function GET(req: NextRequest) {
  const verify = verifySignature(req, "");
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { searchParams } = new URL(req.url);
  const clientEmail = searchParams.get("clientEmail")?.toLowerCase().trim();

  if (!clientEmail) {
    return NextResponse.json({ error: "clientEmail je obavezan." }, { status: 400 });
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));
  const skip = (page - 1) * limit;

  try {
    await connectToDB();

    const filter = { clientEmail: { $regex: `^${clientEmail}$`, $options: "i" } };

    const [appointments, totalCount] = await Promise.all([
      Appointment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Appointment.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return NextResponse.json({
      appointments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/appointments error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const bodyText = await req.clone().text();
  const verify = verifySignature(req, bodyText);
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const apiKey = req.headers.get("x-api-key") ?? "dev";
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ error: "Previše zahteva" }, { status: 429 });
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Neispravan JSON." }, { status: 400 });
  }

  const salonId = typeof data.salonId === "string" ? data.salonId : "";
  const name = typeof data.name === "string" ? data.name : "";
  const serviceId = typeof data.serviceId === "string" ? data.serviceId : "";
  const serviceNameIn = typeof data.serviceName === "string" ? data.serviceName : "";
  const services = Array.isArray(data.services)
    ? (data.services as IAppointmentService[])
    : [];
  const date = typeof data.date === "string" ? data.date : "";
  const time = typeof data.time === "string" ? data.time : "";
  const note = typeof data.note === "string" ? data.note : undefined;
  const tiktok = typeof data.tiktok === "string" ? data.tiktok : undefined;
  const contactNote = typeof data.contactNote === "string" ? data.contactNote : undefined;
  const preferredContact =
    typeof data.preferredContact === "string" ? data.preferredContact : undefined;
  const { phone, email, instagram } = data; // unknown — normalize* helperi to primaju

  const normalizedPhone = normalizeContactValue(phone);
  const normalizedEmail = normalizeEmail(email);
  const normalizedInstagram = normalizeInstagram(instagram);

  // ── Validacija ──────────────────────────────────────────────────────────────
  if (!salonId) {
    return NextResponse.json({ error: "salonId je obavezan." }, { status: 400 });
  }
  if (!name.trim()) {
    return NextResponse.json({ error: "Ime je obavezno." }, { status: 400 });
  }
  if (!hasGuestBookingContact({ phone, email, instagram })) {
    return NextResponse.json(
      { error: "Za zakazivanje kao gost unesite telefon, email ili Instagram." },
      { status: 400 },
    );
  }
  if (!serviceId) {
    return NextResponse.json({ error: "Nedostaje ID usluge." }, { status: 400 });
  }
  if (!date || !time) {
    return NextResponse.json({ error: "Datum i vreme su obavezni." }, { status: 400 });
  }

  try {
    await connectToDB();

    // ── salonId → tenant ──────────────────────────────────────────────────────
    const salon = await SalonProfile.findById(salonId).select("tenantId").lean();
    if (!salon) {
      return NextResponse.json({ error: "Salon nije pronađen." }, { status: 404 });
    }
    const tenantId = String((salon as Record<string, unknown>).tenantId ?? "");
    const denied = await requireCapability(tenantId, "booking.services");
    if (denied) return denied;

    const tenantDoc = await Tenant.findById(tenantId).lean();
    if (!tenantDoc) {
      return NextResponse.json({ error: "Salon nije pronađen." }, { status: 404 });
    }
    const tenant = tenantDoc as unknown as ITenant;

    if (!canAcceptBookings(tenant)) {
      return NextResponse.json(
        { error: "Salon nije aktivan. Zakazivanje nije moguće." },
        { status: 403 },
      );
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return NextResponse.json({ error: "Usluga nije pronađena." }, { status: 404 });
    }

    const { profile: salonProfile, cancellationWindowHours } =
      await loadBookingProfile(tenantId);

    // ── Provera dostupnosti — UVEK enforce (radno vreme + overlap + manualSlots) ──
    const requestedDuration = Number(data.duration) || service.duration || 60;
    const slotError = await checkSlotAvailability({
      tenantId,
      date,
      time,
      requestedDuration,
      profile: salonProfile,
      enforceWorkingHours: true,
    });
    if (slotError) {
      // Booking app očekuje 409 za zauzet/nedostupan termin (kao /update ruta).
      return NextResponse.json({ error: slotError }, { status: 409 });
    }

    // ── Guest profil (lenjo po salonu) + termin ───────────────────────────────
    const guestUser = await findOrCreateGuestUser({
      tenantObjectId: tenant._id,
      name,
      normalizedPhone,
      normalizedEmail,
      normalizedInstagram,
      tiktok,
    });

    const resolvedServiceName = serviceNameIn || service.name;

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
      services: services.map((s) => ({
        ...s,
        serviceName: s.serviceName,
        duration: s.duration,
      })),
      date,
      time,
      duration: requestedDuration,
      note: note || undefined,
      status: "pending",
      messages: [],
      adminNotified: true,
      clientNotified: false,
      lastUpdatedBy: "client",
      unreadCount: { client: 0, admin: 0 },
    });

    await appointment.save();

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
    console.error("POST /api/marketplace/appointments error:", error);

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

    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
