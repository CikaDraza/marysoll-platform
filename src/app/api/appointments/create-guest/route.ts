/**
 * POST /api/appointments/create-guest
 *
 * Admin-only. Creates a guest TenantUser + Appointment on behalf of the admin.
 * Mirrors the logic of the public guest endpoint but uses admin auth so
 * the tenantId is read from the JWT instead of the URL slug.
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
import { requireAdmin } from "@/lib/auth/auth-server";
import { createAppointmentNotification } from "@/lib/notificationService";
import {
  hasGuestBookingContact,
  inferPreferredContact,
  normalizeContactValue,
  normalizeEmail,
  normalizeInstagram,
} from "@/lib/contactRules";
import type { IAppointmentService } from "@/types";
import type { ITenant } from "@/models/Tenant";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  if (!auth.success) return auth.response;

  const { decoded } = auth;
  if (!decoded.tenantId) {
    return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 404 });
  }

  await connectToDB();

  const tenantDoc = await Tenant.findById(decoded.tenantId).lean();
  if (!tenantDoc) {
    return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
  }

  const tenant = tenantDoc as unknown as ITenant;
  const tenantId = tenant._id?.toString() ?? "";

  const data = await request.json().catch(() => ({}));
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

  if (!name?.trim()) return NextResponse.json({ error: "Ime je obavezno." }, { status: 400 });
  if (!hasGuestBookingContact({ phone, email, instagram })) {
    return NextResponse.json(
      { error: "Za zakazivanje kao gost unesite telefon, email ili Instagram." },
      { status: 400 },
    );
  }
  if (!serviceId) return NextResponse.json({ error: "Nedostaje ID usluge." }, { status: 400 });
  if (!date || !time) return NextResponse.json({ error: "Datum i vreme su obavezni." }, { status: 400 });

  const service = await Service.findById(serviceId);
  if (!service) return NextResponse.json({ error: "Usluga nije pronađena." }, { status: 404 });
  const salonProfile = await SalonProfile.findOne({ tenantId })
    .select("cancellationWindowHours")
    .lean<{ cancellationWindowHours?: number }>();
  const cancellationWindowHours =
    typeof salonProfile?.cancellationWindowHours === "number"
      ? salonProfile.cancellationWindowHours
      : 1;

  const existing = await Appointment.findOne({
    tenantId,
    date,
    time,
    status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
  });
  if (existing) return NextResponse.json({ error: "Termin je zauzet." }, { status: 400 });

  // Find or create GUEST TenantUser
  let guestUser = null;

  if (normalizedEmail) {
    guestUser = await TenantUser.findOne({ tenantId: tenant._id, email: normalizedEmail });
  }

  if (!guestUser) {
    const guestEmail =
      normalizedEmail ||
      `guest_${Date.now()}_${crypto.randomBytes(4).toString("hex")}@noemail.guest`;

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

  const resolvedServiceName = serviceName || service.name;

  const appointment = new Appointment({
    tenantId,
    clientProfileId: guestUser._id.toString(),
    clientName: name.trim(),
    clientEmail: guestUser.email,
    clientPhone: normalizedPhone,
    clientInstagram: normalizedInstagram,
    preferredContact:
      preferredContact ||
      inferPreferredContact({ phone, email, instagram }),
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
    adminNotified: false,
    clientNotified: false,
    lastUpdatedBy: "admin",
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
    { message: "Termin uspešno zakazan.", appointmentId: appointment._id.toString() },
    { status: 201 },
  );
}
