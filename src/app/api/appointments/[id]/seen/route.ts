import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifyToken } from "@/lib/auth/auth-server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDB();

    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = verifyToken(token!);
    const { id } = await context.params;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = user.isAdmin;

    const appointmentId = id;

    await Appointment.findByIdAndUpdate(appointmentId, {
      ...(isAdmin
        ? {
            "lastSeen.admin": new Date(),
            "unreadCount.admin": 0,
          }
        : {
            "lastSeen.client": new Date(),
            "unreadCount.client": 0,
          }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Greška pri azuriranju :", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
