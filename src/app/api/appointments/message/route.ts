// app/api/appointments/message/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifyToken } from "@/lib/auth/auth-server";
import { actorScopeFrom, logSuperAdminAccess } from "@/lib/auth/tenantScope";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { createAppointmentNotification } from "@/lib/notificationService";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Izolacija: ranije je `findById(appointmentId)` značio da svaki ulogovan
    // korisnik može da upiše poruku u tuđi termin (i tuđeg salona) i time
    // pošalje notifikaciju tuđim adminima.
    const scope = actorScopeFrom(decoded);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }
    if (!scope.isSuperAdmin) {
      const denied = await requireCapability(decoded.tenantId, "booking.services");
      if (denied) return denied;
    }
    if (scope.isSuperAdmin) {
      logSuperAdminAccess(
        "SUPERADMIN_UNSCOPED_APPOINTMENT_MESSAGE",
        decoded,
        req.url,
      );
    }

    const { appointmentId, message } = await req.json();
    if (!appointmentId || !message) {
      return NextResponse.json(
        { error: "Appointment ID i poruka su obavezni" },
        { status: 400 },
      );
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      ...scope.filter,
    });
    if (!appointment) {
      return NextResponse.json(
        { error: "Termin nije pronađen" },
        { status: 404 },
      );
    }

    // Privilegije iz scope-a, ne iz golog tokena (vidi tenantScope.ts).
    const isAdmin = scope.actor !== "client";

    // Dodaj poruku
    const newMessage = {
      sender: isAdmin ? "admin" : "client",
      message,
      timestamp: new Date(),
    };

    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, ...scope.filter },
      {
        $push: { messages: newMessage },
        $set: {
          lastUpdatedBy: isAdmin ? "admin" : "client",
          ...(isAdmin ? { clientNotified: false } : { adminNotified: true }),
        },
        $inc: isAdmin
          ? { "unreadCount.client": 1 }
          : { "unreadCount.admin": 1 },
      },
      { new: true },
    );
    if (!updatedAppointment) {
      return NextResponse.json(
        { error: "Greška pri slanju poruke" },
        { status: 500 },
      );
    }

    await createAppointmentNotification(
      {
        _id: appointment._id.toString(),
        tenantId: appointment.tenantId,
        clientProfileId: appointment.clientProfileId?.toString() ?? "",
        clientName: appointment.clientName,
        serviceName: appointment.serviceName,
      },
      "message",
      {
        sender: isAdmin ? "admin" : "client",
        message: message.substring(0, 100),
      },
    );

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Greška pri slanju poruke" },
      { status: 500 },
    );
  }
}
