import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifyToken } from "@/lib/auth/auth-server";
import { tenantScopeFrom } from "@/lib/auth/tenantScope";

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

    // Izolacija tenanta: ranije se markiralo po golom ID-ju, pa je korisnik
    // jednog salona mogao da označi tuđi termin kao pročitan.
    const scope = tenantScopeFrom(user);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const isAdmin = user.isAdmin;

    await Appointment.findOneAndUpdate({ _id: id, ...scope.filter }, {
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
