import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { getTokenFromRequest, verifyToken } from "@/lib/auth/auth-server";
import { canClientCancelAppointment } from "@/lib/appointments/cancellation";
import { createAppointmentNotification } from "@/lib/notificationService";
import { loyaltyOnAppointmentStatusChange } from "@/lib/loyalty/hooks";

export async function POST(
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

  if (
    appointment.status === "appointment_cancelled" ||
    appointment.status === "completed" ||
    appointment.status === "no_show"
  ) {
    return NextResponse.json(
      { error: "Termin se više ne može otkazati." },
      { status: 400 },
    );
  }

  const now = new Date();
  const canCancel = canClientCancelAppointment(appointment, now);
  const previousStatus = appointment.status;

  appointment.lastUpdatedBy = "client";
  appointment.cancelledAt = now;
  appointment.cancelledBy = "client";

  if (canCancel) {
    appointment.status = "appointment_cancelled";
    appointment.cancellationType = "legitimate";
    appointment.cancellationStatus = "can_cancel";
  } else {
    appointment.status = "no_show";
    appointment.cancellationType = "late";
    appointment.cancellationStatus = "late_cancel";
    appointment.noShowMarkedAt = now;
    appointment.noShowReason = "late_cancel";
  }

  await appointment.save();

  // Growth Studio: oslobađanje vaučera / no-show politika (nikad ne baca)
  await loyaltyOnAppointmentStatusChange(
    appointment._id.toString(),
    previousStatus,
    appointment.status,
  );

  if (canCancel) {
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
      "cancelled",
      {
        sender: "client",
        message: "Klijent je otkazao termin u dozvoljenom roku.",
      },
    );
  }

  return NextResponse.json({
    message: canCancel
      ? "Termin je otkazan."
      : "Vreme za otkazivanje termina je isteklo.",
    appointment,
  });
}
