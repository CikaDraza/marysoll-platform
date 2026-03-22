// app/api/users/settings/test-email/route.ts
import { verifyToken } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { sendEmail } from "@/lib/email/email";
import { buildEmail } from "@/lib/email/test-email/sendEmail";
import { User } from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectToDB();

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Korisnik iz baze
    const dbUser = await User.findById(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Provera email notifikacija
    const userSettings = dbUser.notificationSettings ?? {
      emailNotifications: true,
    };
    if (!userSettings.emailNotifications) {
      return NextResponse.json(
        { error: "Email notifikacije su isključene u vašim postavkama" },
        { status: 400 },
      );
    }

    // Tip mejla iz body-a
    const body = await req.json();
    const { type } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Missing email type" },
        { status: 400 },
      );
    }

    // Build HTML i subject za odabrani tip
    let subject: string;
    let html: string;
    let emailType: "salon" | "newsletter" | "system";

    try {
      ({ subject, html, emailType } = await buildEmail(type, {
        clientName: dbUser.name,
        email: dbUser.email,
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Nepoznat tip emaila";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Slanje
    await sendEmail({
      to: dbUser.email,
      subject: `[TEST] ${subject}`,
      html,
      type: emailType,
    });

    return NextResponse.json({
      success: true,
      message: "Test email uspešno poslat",
      details: {
        type,
        sentTo: dbUser.email,
        subject: `[TEST] ${subject}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error sending test email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
