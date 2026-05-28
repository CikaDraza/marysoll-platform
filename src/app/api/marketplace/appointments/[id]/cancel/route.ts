/**
 * POST /api/marketplace/appointments/[id]/cancel
 * Body: { clientEmail: string }
 *
 * Cross-tenant cancellation endpoint.
 * Protected by HMAC — the calling server passes the clientEmail it extracted
 * from the user's verified Bearer token, so no tenant-scoped JWT is needed.
 * Applies the same cancellation-window logic as the tenant endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { canClientCancelAppointment } from "@/lib/appointments/cancellation";
import { createAppointmentNotification } from "@/lib/notificationService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const bodyText = await req.clone().text();
  const verify = verifySignature(req, bodyText);
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const { id } = await context.params;

  let clientEmail: string | undefined;
  try {
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.toLowerCase().trim() : undefined;
  } catch {
    return NextResponse.json({ error: "Neispravan JSON." }, { status: 400 });
  }

  if (!clientEmail) {
    return NextResponse.json({ error: "clientEmail je obavezan." }, { status: 400 });
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

    if (
      appointment.status === "appointment_cancelled" ||
      appointment.status === "completed" ||
      appointment.status === "no_show"
    ) {
      return NextResponse.json({ error: "Termin se više ne može otkazati." }, { status: 400 });
    }

    const now = new Date();
    const canCancel = canClientCancelAppointment(appointment, now);

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
      message: canCancel ? "Termin je otkazan." : "Vreme za otkazivanje termina je isteklo.",
      appointment,
    });
  } catch (error) {
    console.error("POST /api/marketplace/appointments/[id]/cancel error:", error);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
