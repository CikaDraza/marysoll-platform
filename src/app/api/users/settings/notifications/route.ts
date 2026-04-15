// app/api/user/settings/notifications/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/auth-server";
import { TenantUser } from "@/models/TenantUser";

// DEFAULT postavke za SVE korisnike
const DEFAULT_SETTINGS = {
  emailNotifications: true,
  pushNotifications: true,
  browserNotifications: true,

  // Termini
  appointmentCreated: true,
  appointmentApproved: true,
  appointmentRejected: true,
  appointmentRescheduled: true,
  appointmentCancelled: true,
  appointmentMessage: true,
  appointmentMessageEmail: true,
  appointmentReminder: true,
  reminderHours: 24,

  // Preporuke/komentari
  testimonialCreated: true,
  testimonialReplied: true,
  testimonialUpdated: true,
  testimonialDeleted: true,
  testimonialMessage: true,

  // Newsletter (opciono)
  newsletterPromotions: true,
  newsletterUpdates: true,
  newsletterTips: true,
};

export async function GET(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    if (!decoded.tenantUserId) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    const tenantUser = await TenantUser.findById(decoded.tenantUserId)
      .select("notificationSettings")
      .lean<{ notificationSettings: typeof DEFAULT_SETTINGS | null }>();

    if (!tenantUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(tenantUser.notificationSettings || DEFAULT_SETTINGS);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
