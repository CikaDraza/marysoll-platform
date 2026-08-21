// src/app/api/appointments/delete/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Appointment } from "@/models/Appointment";
import { verifyToken } from "@/lib/auth/auth-server";
import { logSuperAdminAccess, tenantScopeFrom } from "@/lib/auth/tenantScope";
import { requireCapability } from "@/lib/platform/capabilities-server";

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

    // Izolacija tenanta: brisanje po ID-ju je ranije bilo bez provere vlasništva,
    // pa je admin jednog salona mogao da obriše termin drugog salona.
    const scope = tenantScopeFrom(user);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }
    if (scope.isSuperAdmin) {
      logSuperAdminAccess("SUPERADMIN_UNSCOPED_APPOINTMENT_DELETE", user, req.url);
    }
    if (!scope.isSuperAdmin) {
      const denied = await requireCapability(user.tenantId, "booking.services");
      if (denied) return denied;
    }

    const deleted = await Appointment.findOneAndDelete({
      _id: id,
      ...scope.filter,
    });

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
