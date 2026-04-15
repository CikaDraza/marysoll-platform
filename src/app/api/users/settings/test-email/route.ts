// app/api/users/settings/test-email/route.ts
import { verifyToken } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { sendEmail } from "@/lib/email/email";
import { buildEmail } from "@/lib/email/test-email/sendEmail";
import { TenantUser } from "@/models/TenantUser";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // decoded.id = TenantUser._id for tenant users
    const tenantUser = await TenantUser.findById(decoded.id)
      .select("email name notificationSettings")
      .lean<{
        email: string;
        name?: string;
        notificationSettings?: { emailNotifications?: boolean };
      }>();

    if (!tenantUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userSettings = tenantUser.notificationSettings ?? { emailNotifications: true };
    if (!userSettings.emailNotifications) {
      return NextResponse.json(
        { error: "Email notifikacije su isključene u vašim postavkama" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { type } = body;

    if (!type) {
      return NextResponse.json({ error: "Missing email type" }, { status: 400 });
    }

    let subject: string;
    let html: string;
    let emailType: "salon" | "newsletter" | "system";

    try {
      ({ subject, html, emailType } = await buildEmail(type, {
        clientName: tenantUser.name ?? tenantUser.email.split("@")[0],
        email: tenantUser.email,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nepoznat tip emaila";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await sendEmail({
      to: tenantUser.email,
      subject: `[TEST] ${subject}`,
      html,
      type: emailType,
    });

    return NextResponse.json({
      success: true,
      message: "Test email uspešno poslat",
      details: {
        type,
        sentTo: tenantUser.email,
        subject: `[TEST] ${subject}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error sending test email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
