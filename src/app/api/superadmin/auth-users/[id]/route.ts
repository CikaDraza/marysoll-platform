// PATCH / DELETE /api/superadmin/auth-users/[id]
// Supports both TenantUser records and orphaned AuthUser records.
// Pass ?type=auth to delete an orphaned AuthUser directly.
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();
    const { id } = await params;
    const body = await req.json();

    const allowed = ["name", "email", "phone", "role"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const user = await TenantUser.findByIdAndUpdate(id, update, { new: true })
      .select("_id name email phone role isOnline lastActive isEmailVerified createdAt")
      .lean();

    if (!user) return NextResponse.json({ error: "Korisnik nije pronađen" }, { status: 404 });

    return NextResponse.json(user);
  } catch (err) {
    console.error("[PATCH /api/superadmin/auth-users/:id]", err);
    return NextResponse.json({ error: "Greška pri ažuriranju" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectToDB();
    const { id } = await params;
    const isOrphan = req.nextUrl.searchParams.get("type") === "auth";

    if (isOrphan) {
      // Delete orphaned AuthUser directly
      const authUser = await AuthUser.findByIdAndDelete(id);
      if (!authUser) return NextResponse.json({ error: "Korisnik nije pronađen" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    // Standard TenantUser deletion
    const user = await TenantUser.findByIdAndDelete(id);
    if (!user) return NextResponse.json({ error: "Korisnik nije pronađen" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/superadmin/auth-users/:id]", err);
    return NextResponse.json({ error: "Greška pri brisanju" }, { status: 500 });
  }
}
