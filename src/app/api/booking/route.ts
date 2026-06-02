// POST /api/booking — guest booking via salonId, HMAC-signed
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
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
import type { IAppointmentService } from "@/types";
import type { ITenant } from "@/models/Tenant";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const verify = verifySignature(req, rawBody);
  if (!verify.ok) {
    return NextResponse.json(
      { error: verify.error },
      { status: verify.status },
    );
  }

  const apiKey = req.headers.get("x-api-key") ?? "dev";
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ error: "Previše zahteva" }, { status: 429 });
  }

  try {
    const { salonId, serviceId, startTime, user } = JSON.parse(rawBody);

    if (!salonId || !serviceId || !startTime) {
      return NextResponse.json(
        { error: "salonId, serviceId i startTime su obavezni" },
        { status: 400 },
      );
    }
    const normalizedPhone = normalizeContactValue(user?.phone);
    const normalizedEmail = normalizeEmail(user?.email);
    const normalizedInstagram = normalizeInstagram(user?.instagram);

    if (!user?.name?.trim()) {
      return NextResponse.json({ error: "Ime je obavezno" }, { status: 400 });
    }
    if (!hasGuestBookingContact(user ?? {})) {
      return NextResponse.json(
        {
          error:
            "Za zakazivanje kao gost unesite telefon, email ili Instagram.",
        },
        { status: 400 },
      );
    }

    await connectToDB();

    const salon = await SalonProfile.findById(salonId)
      .select("tenantId cancellationWindowHours")
      .lean();
    if (!salon) {
      return NextResponse.json(
        { error: "Salon nije pronađen" },
        { status: 404 },
      );
    }
    const tenantId = String((salon as Record<string, unknown>).tenantId ?? "");
    const cancellationWindowHours =
      typeof (salon as Record<string, unknown>).cancellationWindowHours ===
      "number"
        ? ((salon as Record<string, unknown>).cancellationWindowHours as number)
        : 1;

    const tenantDoc = await Tenant.findById(tenantId).lean();
    if (!tenantDoc) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 404 },
      );
    }
    const tenant = tenantDoc as unknown as ITenant;

    const now = new Date();
    const trialEndsAt = tenant.trialEndsAt
      ? new Date(tenant.trialEndsAt)
      : null;
    const isTrialActive =
      tenant.isTrialActive && trialEndsAt && trialEndsAt > now;
    if (!tenant.paid && !isTrialActive && tenant.plan !== "maria") {
      return NextResponse.json(
        { error: "Salon nije aktivan. Zakazivanje nije moguće." },
        { status: 403 },
      );
    }

    const service = await Service.findById(serviceId).lean();
    if (!service) {
      return NextResponse.json(
        { error: "Usluga nije pronađena" },
        { status: 404 },
      );
    }
    const sv = service as Record<string, unknown>;

    const dt = new Date(startTime);
    const date = dt.toISOString().slice(0, 10);
    const time = `${dt.getUTCHours().toString().padStart(2, "0")}:${dt.getUTCMinutes().toString().padStart(2, "0")}`;

    const existing = await Appointment.findOne({
      tenantId,
      date,
      time,
      status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
    });
    if (existing) {
      return NextResponse.json({ error: "Termin je zauzet." }, { status: 400 });
    }

    let guestUser = null;

    if (normalizedEmail) {
      guestUser = await TenantUser.findOne({
        tenantId,
        email: normalizedEmail,
      });
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
        tenantId,
        email: guestEmail,
        password: placeholderPassword,
        name: user.name.trim(),
        phone: normalizedPhone,
        instagram: normalizedInstagram || null,
        role: "GUEST",
        status: "invited",
        isEmailVerified: false,
      });
    }

    const duration = typeof sv.duration === "number" ? sv.duration : 60;
    const serviceName = String(sv.name ?? "Usluga");

    const appointment = new Appointment({
      tenantId,
      clientProfileId: guestUser._id.toString(),
      clientName: user.name.trim(),
      clientEmail: guestUser.email,
      clientPhone: normalizedPhone,
      clientInstagram: normalizedInstagram,
      preferredContact: user.preferredContact || inferPreferredContact(user),
      contactNote: normalizeContactValue(user.contactNote),
      cancellationWindowHours,
      cancellationStatus: "can_cancel",
      serviceName,
      services: [
        {
          serviceId,
          serviceName,
          duration,
          price: sv.basePrice ?? 0,
          quantity: 1,
        } as IAppointmentService,
      ],
      date,
      time,
      duration,
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
        tenantId,
        clientProfileId: guestUser._id.toString(),
        clientName: user.name.trim(),
        clientEmail: appointment.clientEmail,
        serviceName,
        date,
        time,
        clientPhone: appointment.clientPhone,
        clientInstagram: appointment.clientInstagram,
        preferredContact: appointment.preferredContact,
        contactNote: appointment.contactNote,
      },
      "created",
    );

    return NextResponse.json(
      { _id: appointment._id.toString(), message: "Termin uspešno zakazan." },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/booking]", err);
    return NextResponse.json(
      { error: "Greška pri zakazivanju" },
      { status: 500 },
    );
  }
}
