import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { UserIdentity } from "@/models/UserIdentity";

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token i nova lozinka su obavezni" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Lozinka mora imati najmanje 8 karaktera" },
        { status: 400 }
      );
    }

    await connectToDB();

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token je nevažeći ili je istekao" },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Passive sync — user.password is already the bcrypt hash at this point.
    // No upsert: if UserIdentity is absent (pre-migration account), do nothing.
    try {
      await UserIdentity.findOneAndUpdate(
        { legacyUserId: user._id },
        { passwordHash: user.password },
      );
    } catch (identityErr) {
      console.error("⚠️ UserIdentity passwordHash sync failed (non-fatal):", identityErr);
    }

    return NextResponse.json({ message: "Lozinka je uspešno promenjena" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
