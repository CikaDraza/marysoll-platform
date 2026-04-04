/**
 * POST /api/auth/change-password
 *
 * Change password for the currently authenticated user.
 * Requires a valid auth token and the current password for verification.
 *
 * Body: { currentPassword: string; newPassword: string }
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth/auth-server";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
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

    const user = await User.findById(authResult.decoded.id);
    if (!user) {
      return NextResponse.json(
        { error: "Korisnik nije pronađen." },
        { status: 404 },
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Trenutna lozinka nije ispravna." },
        { status: 401 },
      );
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return NextResponse.json({ message: "Lozinka uspešno promenjena." });
  } catch (err) {
    console.error("[POST /api/auth/change-password]", err);
    return NextResponse.json({ error: "Greška na serveru." }, { status: 500 });
  }
}
