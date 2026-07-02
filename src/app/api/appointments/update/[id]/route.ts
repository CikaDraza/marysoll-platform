// src/app/api/appointments/update/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { resolveTenant, verifyToken } from "@/lib/auth/auth-server";
import { createAppointmentNotification } from "@/lib/notificationService";
import { loyaltyOnAppointmentStatusChange } from "@/lib/loyalty/hooks";
import { IAppointment } from "@/types";
import { Notification } from "@/models/Notification";
import { Types } from "mongoose";

interface UpdateAppointmentData {
  status?:
    | "pending"
    | "appointment_approved"
    | "appointment_rejected"
    | "appointment_rescheduled"
    | "appointment_cancelled"
    | "completed"
    | "no_show";
  proposedDate?: string;
  proposedTime?: string;
  date?: string;
  time?: string;
  note?: string;
  lastUpdatedBy?: "client" | "admin";
  cancelledAt?: Date;
  cancelledBy?: "client" | "admin";
  cancellationType?: "legitimate" | "late";
  noShowMarkedAt?: Date;
  noShowReason?: "late_cancel" | "missed_appointment" | "admin_marked";
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await connectToDB();

  const { id } = await context.params;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const tenant = await resolveTenant(req);
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

    const updatedData: UpdateAppointmentData = await req.json();

    // Growth Studio polja se menjaju isključivo kroz loyalty servis —
    // nikad direktno kroz ovaj update (payload ide u findByIdAndUpdate).
    const raw = updatedData as Record<string, unknown>;
    delete raw.appliedVoucherId;
    delete raw.appliedPromotionId;
    delete raw.originalPrice;
    delete raw.discountAmount;
    delete raw.finalPrice;
    delete raw.completedAt;
    delete raw.completionSource;
    delete raw.completionPromptSentAt;
    delete raw.loyaltyProcessed;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return NextResponse.json(
        { error: "Termin nije pronađen" },
        { status: 404 },
      );
    }

    // Use isAdmin from JWT — no extra DB call needed
    const isAdmin = decoded.isAdmin ?? false;

    // Completion i no-show su isključivo admin akcije (od njih zavisi
    // dodela loyalty nagrada — klijent ne sme sam da "završi" termin).
    if (
      !isAdmin &&
      (updatedData.status === "completed" || updatedData.status === "no_show")
    ) {
      return NextResponse.json(
        { error: "Samo salon može označiti termin kao završen ili propušten" },
        { status: 403 },
      );
    }

    // Postavi ko je poslednji ažurirao
    updatedData.lastUpdatedBy = isAdmin ? "admin" : "client";
    if (isAdmin && updatedData.status === "appointment_cancelled") {
      updatedData.cancelledAt = new Date();
      updatedData.cancelledBy = "admin";
      updatedData.cancellationType = "legitimate";
    }
    if (isAdmin && updatedData.status === "no_show") {
      updatedData.noShowMarkedAt = new Date();
      updatedData.noShowReason = "admin_marked";
    }

    // Ako admin predlaže novi termin
    if (updatedData.proposedDate && updatedData.proposedTime && isAdmin) {
      updatedData.status = "appointment_rescheduled";

      // Kreiraj notifikaciju za predlog novog termina
      await Notification.create({
        recipientProfileId: appointment.clientProfileId,
        tenantId: appointment.tenantId,
        appointmentId: appointment._id,
        type: "appointment_rescheduled",
        title: "Novi termin predložen",
        message: `Salon je predložio novi termin za ${appointment.serviceName}.`,
        metadata: {
          oldDate: appointment.date,
          oldTime: appointment.time,
          newDate: updatedData.proposedDate,
          newTime: updatedData.proposedTime,
          serviceName: appointment.serviceName,
        },
        isRead: false,
      });
    }

    // Ako se prihvata predlog (od strane klijenta)
    if (
      updatedData.status === "appointment_approved" &&
      appointment.proposedDate
    ) {
      // Postavi stvarni termin na predloženi
      updatedData.date = appointment.proposedDate;
      updatedData.time = appointment.proposedTime;
      updatedData.proposedDate = undefined;
      updatedData.proposedTime = undefined;

      // Notifikacija za admina da je klijent prihvatio termin
      await Notification.create({
        recipientProfileId: appointment.clientProfileId,
        tenantId: appointment.tenantId,
        appointmentId: appointment._id,
        type: "appointment_approved",
        title: "Termin prihvaćen",
        message: `Klijent je prihvatio predloženi termin za ${appointment.serviceName}.`,
        metadata: {
          date: updatedData.date,
          time: updatedData.time,
          serviceName: appointment.serviceName,
          clientName: appointment.clientName,
        },
        isRead: false,
      });
    }

    // Ako se odbija predlog
    if (updatedData.status === "pending" && appointment.proposedDate) {
      updatedData.proposedDate = undefined;
      updatedData.proposedTime = undefined;

      await Notification.create({
        recipientProfileId: appointment.clientProfileId,
        tenantId: appointment.tenantId,
        appointmentId: appointment._id,
        type: "appointment_rejected",
        title: "Predlog odbijen",
        message: `Klijent je odbio predloženi termin za ${appointment.serviceName}.`,
        metadata: {
          serviceName: appointment.serviceName,
          clientName: appointment.clientName,
        },
        isRead: false,
      });
    }

    const updated = await Appointment.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    // Notifikacija za promenu statusa
    if (updatedData.status && updatedData.status !== appointment.status) {
      await handleStatusChangeNotification(
        appointment,
        updatedData.status,
        tenantId!,
      );

      // Growth Studio: dodela/povlačenje nagrada + voucher lifecycle
      // (nikad ne baca — loyalty ne sme da sruši ažuriranje termina)
      await loyaltyOnAppointmentStatusChange(
        id,
        appointment.status,
        updatedData.status,
        { source: "admin" },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju termina" },
      { status: 500 },
    );
  }
}

async function handleStatusChangeNotification(
  appointment: IAppointment,
  newStatus:
    | "pending"
    | "appointment_approved"
    | "appointment_rejected"
    | "appointment_rescheduled"
    | "appointment_cancelled"
    | "completed"
    | "no_show",
  tenantId: Types.ObjectId | string,
) {
  const statusToNotificationType: Record<
    string,
    "approved" | "rejected" | "rescheduled" | "cancelled"
  > = {
    appointment_approved: "approved",
    appointment_rejected: "rejected",
    appointment_rescheduled: "rescheduled",
    appointment_cancelled: "cancelled",
  };

  const notificationType = statusToNotificationType[newStatus];
  if (!notificationType) return;

  const clientName = appointment.clientName || "Klijent";

  try {
    await createAppointmentNotification(
      {
        _id: appointment._id?.toString() || "",
        tenantId: tenantId!,
        clientProfileId: appointment.clientProfileId?.toString() || "",
        clientName: clientName,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
        note: appointment.note,
      },
      notificationType,
      {
        sender: "admin",
        message: `Status termina je promenjen u ${newStatus}`,
      },
    );
  } catch (error) {
    console.error(`❌ Error creating notification:`, error);
  }
}
