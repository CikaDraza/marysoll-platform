// src/app/api/appointments/delete/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifyToken } from "@/lib/auth/auth-server";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
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

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Samo admin može da briše termine" },
        { status: 403 }
      );
    }

    const deleted = await Appointment.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Termin nije pronađen" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Greška pri brisanju termina" },
      { status: 500 }
    );
  }
}
