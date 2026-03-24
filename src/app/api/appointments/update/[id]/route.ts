// src/app/api/appointments/update/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { resolveTenant, verifyToken } from "@/lib/auth/auth-server";
import { createAppointmentNotification } from "@/lib/notificationService";
import { IAppointment } from "@/types";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { Types } from "mongoose";

interface UpdateAppointmentData {
  status?:
    | "pending"
    | "appointment_approved"
    | "appointment_rejected"
    | "appointment_rescheduled"
    | "appointment_cancelled";
  proposedDate?: string;
  proposedTime?: string;
  date?: string;
  time?: string;
  note?: string;
  lastUpdatedBy?: "client" | "admin";
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
    const user = verifyToken(token);

    if (!user) {
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
    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return NextResponse.json(
        { error: "Termin nije pronađen" },
        { status: 404 },
      );
    }

    // Proveri da li je admin na osnovu user objekta iz tokena
    // Ako nemate isAdmin u tokenu, možete proveriti preko baze
    const isAdmin = await checkIfUserIsAdmin(user.id);

    // Postavi ko je poslednji ažurirao
    updatedData.lastUpdatedBy = isAdmin ? "admin" : "client";

    // Ako admin predlaže novi termin
    if (updatedData.proposedDate && updatedData.proposedTime && isAdmin) {
      updatedData.status = "appointment_rescheduled";

      // Kreiraj notifikaciju za predlog novog termina
      await Notification.create({
        userId: appointment.clientId,
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
        userId: appointment.clientId,
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
        userId: appointment.clientId,
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

// Pomocna funkcija za proveru admin statusa
async function checkIfUserIsAdmin(userId: string): Promise<boolean> {
  try {
    const user = await User.findById(userId);
    return user?.isAdmin || false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

async function handleStatusChangeNotification(
  appointment: IAppointment,
  newStatus:
    | "pending"
    | "appointment_approved"
    | "appointment_rejected"
    | "appointment_rescheduled"
    | "appointment_cancelled",
  tenantId: Types.ObjectId | string,
) {
  // Mapiraj duge statuse iz baze na kratke tipove za notifikacije
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

  // Dohvati klijenta
  const client = await User.findById(appointment.clientId);
  const clientName = client?.name || appointment.clientName || "Klijent";

  // Koristite createAppointmentNotification koja će kreirati notifikaciju u bazi
  // i poslati email/push notifikacije
  try {
    await createAppointmentNotification(
      {
        _id: appointment._id?.toString() || "",
        tenantId: tenantId!,
        clientId: appointment.clientId?.toString() || "",
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
