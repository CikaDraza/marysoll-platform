import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { AuthUser } from "@/models/AuthUser";

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { currentPassword, newPassword } = (await req.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };

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

    const authUser = await AuthUser.findById(auth.decoded.id);
    if (!authUser || authUser.platformRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Superadmin nalog nije pronađen." },
        { status: 404 },
      );
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      authUser.passwordHash,
    );

    if (!isMatch) {
      return NextResponse.json(
        { error: "Trenutna lozinka nije ispravna." },
        { status: 401 },
      );
    }

    authUser.passwordHash = await bcrypt.hash(newPassword, 12);
    await authUser.save();

    return NextResponse.json({
      success: true,
      message: "Lozinka uspešno promenjena.",
    });
  } catch (err) {
    console.error("POST /api/superadmin/change-password:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
