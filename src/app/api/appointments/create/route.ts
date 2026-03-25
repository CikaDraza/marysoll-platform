// src/app/api/appointments/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { Tenant } from "@/models/Tenant";
import { requireAuth } from "@/lib/auth/auth-server";
import { createAppointmentNotification } from "@/lib/notificationService";
import type { IAppointmentService } from "@/types";
import type { ITenant } from "@/models/Tenant"; // Uveri se da imaš ovaj import

export async function POST(request: NextRequest) {
  try {
    await connectToDB();

    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { decoded } = authResult;

    // Čitaj header-e iz middleware-a
    const headersList = await headers();
    const tenantSlug = headersList.get("x-tenant-slug");

    let tenant: ITenant | null = null;
    let tenantId: string | null = null;

    // 1. Probaj naći tenant po slug-u iz header-a
    if (tenantSlug && tenantSlug !== "default" && tenantSlug !== "") {
      // Koristi .lean() ali castuj rezultat
      const tenantDoc = await Tenant.findOne({
        slug: tenantSlug,
        status: "active",
      }).lean();

      if (tenantDoc) {
        tenant = tenantDoc as unknown as ITenant;
      }
    }

    // 2. Ako nema, probaj po tenantId iz tokena
    if (!tenant && decoded.tenantId) {
      const tenantDoc = await Tenant.findById(decoded.tenantId).lean();

      if (tenantDoc) {
        tenant = tenantDoc as unknown as ITenant;
      }
    }

    // 3. Ako i dalje nema, vrati grešku
    if (!tenant) {
      return NextResponse.json(
        { error: "Salon nije pronađen" },
        { status: 404 },
      );
    }

    // Eksplicitno konvertuj _id u string
    tenantId = tenant._id?.toString() || null;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Greška sa ID-em salona" },
        { status: 500 },
      );
    }

    // Provera da li salon može primati zakazivanja
    const now = new Date();
    const trialEndsAt = tenant.trialEndsAt
      ? new Date(tenant.trialEndsAt)
      : null;
    const isTrialActive =
      tenant.isTrialActive && trialEndsAt && trialEndsAt > now;

    const canAcceptBookings =
      tenant.paid === true || isTrialActive === true || tenant.plan === "free";

    if (!canAcceptBookings) {
      return NextResponse.json(
        { error: "Salon nije aktivan. Zakazivanje nije moguće." },
        { status: 403 },
      );
    }

    const data = await request.json();

    if (!data.services?.[0]?.serviceId) {
      return NextResponse.json(
        { error: "Nedostaje ID usluge" },
        { status: 400 },
      );
    }

    const service = await Service.findById(data.services[0].serviceId);
    if (!service) {
      return NextResponse.json(
        { error: "Usluga nije pronađena" },
        { status: 404 },
      );
    }

    const { date, time } = data;

    const existing = await Appointment.findOne({
      tenantId,
      date,
      time,
      status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
    });

    if (existing) {
      return NextResponse.json({ error: "Termin je zauzet" }, { status: 400 });
    }

    const appointment = new Appointment({
      ...data,
      tenantId, // Sada je ovo string
      clientId: decoded.id,
      duration: data.duration,
      services: data.services.map((s: IAppointmentService) => ({
        ...s,
        serviceName: s.serviceName,
        duration: s.duration,
      })),
      unreadCount: { client: 0, admin: 0 },
    });

    await appointment.save();

    await createAppointmentNotification(
      {
        _id: appointment._id.toString(),
        tenantId: tenant!._id,
        clientId: appointment.clientId,
        clientName: appointment.clientName,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
      },
      "created",
    );

    return NextResponse.json(
      { message: "✅ Termin uspešno kreiran", appointment },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ ERROR:", error);
    return NextResponse.json(
      { error: "Greška pri čuvanju termina", details: String(error) },
      { status: 500 },
    );
  }
}
