// app/api/appointments/message/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifyToken } from "@/lib/auth/auth-server";
import { createAppointmentNotification } from "@/lib/notificationService";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const { appointmentId, message } = await req.json();
    if (!appointmentId || !message) {
      return NextResponse.json(
        { error: "Appointment ID i poruka su obavezni" },
        { status: 400 }
      );
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json(
        { error: "Termin nije pronađen" },
        { status: 404 }
      );
    }

    const isAdmin = await checkIfUserIsAdmin(user.id);

    // Dodaj poruku
    const newMessage = {
      sender: isAdmin ? "admin" : "client",
      message,
      timestamp: new Date(),
    };

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
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
      { new: true }
    );
    if (!updatedAppointment) {
      return NextResponse.json(
        { error: "Greška pri slanju poruke" },
        { status: 500 }
      );
    }

    await createAppointmentNotification(
      {
        _id: appointment._id.toString(),
        clientId: appointment.clientId,
        clientName: appointment.clientName,
        serviceName: appointment.serviceName,
      },
      "message",
      {
        sender: isAdmin ? "admin" : "client",
        message: message.substring(0, 100),
      }
    );

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Greška pri slanju poruke" },
      { status: 500 }
    );
  }
}

async function checkIfUserIsAdmin(userId: string): Promise<boolean> {
  try {
    const { User } = await import("@/models/User");
    const user = await User.findById(userId);
    return user?.isAdmin || false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}
