import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { AuthUser } from "@/models/AuthUser";
import { TenantUser } from "@/models/TenantUser";

/**
 * POST /api/auth/reset-password
 *
 * Resetuje TenantUser token (salon i management nalozi), odnosno AuthUser
 * token za SUPER_ADMIN. Tokeni su nasumični, jednokratni i važe jedan sat.
 */
export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token i nova lozinka su obavezni" },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Lozinka mora imati najmanje 8 karaktera" },
        { status: 400 },
      );
    }

    await connectToDB();

    const tenantUser = await TenantUser.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (tenantUser) {
      tenantUser.password = await bcrypt.hash(newPassword, 12);
      tenantUser.resetPasswordToken = null;
      tenantUser.resetPasswordExpiry = null;
      await tenantUser.save();

      return NextResponse.json({ message: "Lozinka je uspešno promenjena" });
    }

    const authUser = await AuthUser.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
      platformRole: "SUPER_ADMIN",
    });

    if (!authUser) {
      return NextResponse.json(
        { error: "Token je nevažeći ili je istekao" },
        { status: 400 },
      );
    }

    authUser.passwordHash = await bcrypt.hash(newPassword, 12);
    authUser.resetPasswordToken = null;
    authUser.resetPasswordExpires = null;
    await authUser.save();

    return NextResponse.json({ message: "Lozinka je uspešno promenjena" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
