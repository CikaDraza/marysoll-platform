import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { canClientCancelAppointment } from "@/lib/appointments/cancellation";
import { createAppointmentNotification } from "@/lib/notificationService";
import type { IAppointmentService } from "@/types";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await connectToDB();

  const token = getTokenFromRequest(req);
  const decoded = token ? verifyToken(token) : null;
  if (!decoded?.tenantUserId || !decoded.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const appointment = await Appointment.findOne({
    _id: id,
    tenantId: decoded.tenantId,
    clientProfileId: decoded.tenantUserId,
  });

  if (!appointment) {
    return NextResponse.json({ error: "Termin nije pronađen." }, { status: 404 });
  }

  if (!canClientCancelAppointment(appointment)) {
    appointment.cancellationStatus = "late_cancel";
    await appointment.save();
    return NextResponse.json(
      { error: "Vreme za otkazivanje termina je isteklo." },
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

  const data = await req.json();
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

  const service = await Service.findById(serviceId);
  if (!service) {
    return NextResponse.json({ error: "Usluga nije pronađena." }, { status: 404 });
  }

  const conflict = await Appointment.findOne({
    _id: { $ne: appointment._id },
    tenantId: decoded.tenantId,
    date: data.date,
    time: data.time,
    status: {
      $nin: ["appointment_rejected", "appointment_cancelled"],
    },
  });
  if (conflict) {
    return NextResponse.json({ error: "Termin je zauzet." }, { status: 400 });
  }

  const dateChanged = data.date !== appointment.date;
  const timeChanged = data.time !== appointment.time;

  appointment.date = data.date;
  appointment.time = data.time;
  appointment.serviceName = data.serviceName || service.name;
  appointment.note = data.note || undefined;
  appointment.duration = data.duration || service.duration || appointment.duration;
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

  if (dateChanged || timeChanged) {
    await createAppointmentNotification(
      {
        _id: appointment._id.toString(),
        tenantId: appointment.tenantId,
        clientProfileId: appointment.clientProfileId?.toString() ?? "",
        clientName: appointment.clientName,
        clientEmail: appointment.clientEmail,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
        note: appointment.note,
        clientPhone: appointment.clientPhone,
        clientInstagram: appointment.clientInstagram,
        preferredContact: appointment.preferredContact,
        contactNote: appointment.contactNote,
      },
      "rescheduled",
      {
        sender: "client",
        message: "Klijent je izmenio termin u dozvoljenom roku.",
      },
    );
  }

  return NextResponse.json({ message: "Termin je ažuriran.", appointment });
}
