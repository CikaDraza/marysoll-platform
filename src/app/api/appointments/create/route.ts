// src/app/api/appointments/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { requireAuth, resolveTenant } from "@/lib/auth/auth-server";
import { createAppointmentNotification } from "@/lib/notificationService";
import type { IAppointmentService } from "@/types";

export async function POST(request: NextRequest) {
  try {
    await connectToDB();

    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { decoded } = authResult;
    const tenant = await resolveTenant(request);
    const tenantId = tenant?._id ?? null;

    if (tenant) {
      const isActive =
        tenant.verified === true &&
        (tenant.paid === true || tenant.isTrialActive === true);

      if (!isActive) {
        return NextResponse.json(
          {
            error:
              "Salon nije aktivan. Zakazivanje nije moguće. Proverite pretplatu ili trial period.",
          },
          { status: 403 },
        );
      }
    }

    const data = await request.json();

    const service = await Service.findById(data.services[0].serviceId);
    if (!service) {
      return NextResponse.json(
        { error: "Usluga nije pronađena" },
        { status: 404 },
      );
    }

    const { date, time } = data;

    const existing = await Appointment.findOne({
      ...(tenantId ? { tenantId } : {}),
      date,
      time,
      status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
    });

    if (existing) {
      return NextResponse.json({ error: "Termin je zauzet" }, { status: 400 });
    }

    const appointment = new Appointment({
      ...data,
      tenantId,
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
    console.error("❌ Greška pri čuvanju termina:", error);
    return NextResponse.json(
      { error: "Greška pri čuvanju termina" },
      { status: 500 },
    );
  }
}
