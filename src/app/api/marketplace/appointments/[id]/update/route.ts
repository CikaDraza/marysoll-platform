/**
 * PUT /api/marketplace/appointments/[id]/update
 * Body: { clientEmail: string, date: string, time: string, services?: [...], note?: string, duration?: number, serviceName?: string }
 *
 * Cross-tenant rescheduling endpoint.
 * Protected by HMAC — the calling server passes the clientEmail it extracted
 * from the user's verified Bearer token, so no tenant-scoped JWT is needed.
 * Conflict check is scoped to the appointment's own tenant.
 * Applies the same cancellation-window guard as the tenant endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { canClientCancelAppointment } from "@/lib/appointments/cancellation";
import type { IAppointmentService } from "@/types";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const bodyText = await req.clone().text();
  const verify = verifySignature(req, bodyText);
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { id } = await context.params;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Neispravan JSON." }, { status: 400 });
  }

  const clientEmail =
    typeof data.clientEmail === "string" ? data.clientEmail.toLowerCase().trim() : undefined;

  if (!clientEmail) {
    return NextResponse.json({ error: "clientEmail je obavezan." }, { status: 400 });
  }

  const services = Array.isArray(data.services)
    ? (data.services as IAppointmentService[])
    : [];
  const serviceId = services[0]?.serviceId;

  if (!serviceId || !data.date || !data.time) {
    return NextResponse.json(
      { error: "Datum, vreme i usluga su obavezni." },
      { status: 400 },
    );
  }

  try {
    await connectToDB();

    const appointment = await Appointment.findOne({
      _id: id,
      clientEmail: { $regex: `^${clientEmail}$`, $options: "i" },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Termin nije pronađen." }, { status: 404 });
    }

    if (!canClientCancelAppointment(appointment)) {
      appointment.cancellationStatus = "late_cancel";
      await appointment.save();
      return NextResponse.json(
        { error: "Vreme za izmenu termina je isteklo." },
        { status: 400 },
      );
    }

    if (
      appointment.status === "appointment_cancelled" ||
      appointment.status === "completed" ||
      appointment.status === "no_show"
    ) {
      return NextResponse.json(
        { error: "Termin se više ne može izmeniti." },
        { status: 400 },
      );
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return NextResponse.json({ error: "Usluga nije pronađena." }, { status: 404 });
    }

    // Conflict check scoped to the same tenant as the appointment being updated.
    const conflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      tenantId: appointment.tenantId,
      date: data.date,
      time: data.time,
      status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
    });
    if (conflict) {
      return NextResponse.json({ error: "Termin je zauzet." }, { status: 409 });
    }

    const dateChanged = data.date !== appointment.date;
    const timeChanged = data.time !== appointment.time;

    appointment.date = data.date as string;
    appointment.time = data.time as string;
    appointment.serviceName =
      typeof data.serviceName === "string" ? data.serviceName : (service.name as string);
    appointment.note = typeof data.note === "string" ? data.note : undefined;
    appointment.duration =
      typeof data.duration === "number" ? data.duration : (service.duration ?? appointment.duration);
    appointment.services = services.map((s) => ({
      ...s,
      serviceName: s.serviceName,
      duration: s.duration,
    }));
    appointment.lastUpdatedBy = "client";
    if (dateChanged || timeChanged) {
      appointment.status = "appointment_rescheduled";
    }

    await appointment.save();

    return NextResponse.json({ message: "Termin je ažuriran.", appointment });
  } catch (error) {
    console.error("PUT /api/marketplace/appointments/[id]/update error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
