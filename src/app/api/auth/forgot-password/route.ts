import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { sendResetEmail, sendResetEmailOnAssistant } from "@/lib/email/email";

export async function POST(request: Request) {
  try {
    const { email, assistantSlug, isAssistant } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email je obavezan" }, { status: 400 });
    }

    await connectToDB();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Security: uvek vraćaj istu poruku — ne otkrivaj da li nalog postoji
    if (!user) {
      return NextResponse.json({
        message: "Ako nalog postoji, reset link će biti poslat na email",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 sat

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    if (isAssistant && assistantSlug) {
      await sendResetEmailOnAssistant(user.email, resetToken, assistantSlug);
    } else {
      await sendResetEmail(user.email, resetToken);
    }

    return NextResponse.json({
      message: "Ako nalog postoji, reset link će biti poslat na email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
  }
}
