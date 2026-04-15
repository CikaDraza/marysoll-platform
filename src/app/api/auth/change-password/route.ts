/**
 * POST /api/auth/change-password
 *
 * Tenant-scoped password change for the currently authenticated user.
 * Compares against TenantUser.password and updates it.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { requireAuth } from "@/lib/auth/auth-server";

export async function POST(req: NextRequest) {
  try {
    const authResult = requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Trenutna i nova lozinka su obavezne." },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Nova lozinka mora imati najmanje 8 karaktera." },
        { status: 400 },
      );
    }

    await connectToDB();

    // decoded.id = TenantUser._id for tenant users
    const tenantUser = await TenantUser.findById(authResult.decoded.id);
    if (!tenantUser) {
      return NextResponse.json(
        { error: "Korisnik nije pronađen." },
        { status: 404 },
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, tenantUser.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Trenutna lozinka nije ispravna." },
        { status: 401 },
      );
    }

    tenantUser.password = await bcrypt.hash(newPassword, 12);
    await tenantUser.save();

    return NextResponse.json({ message: "Lozinka uspešno promenjena." });
  } catch (err) {
    console.error("[POST /api/auth/change-password]", err);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
