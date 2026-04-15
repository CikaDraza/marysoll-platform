// app/api/user/settings/notifications/update/route.ts
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

export async function PUT(req: Request) {
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

    if (!decoded.tenantUserId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }

    const settings = await req.json();

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Invalid settings data" },
        { status: 400 },
      );
    }

    // Validacija
    const validKeys = Object.keys(DEFAULT_SETTINGS);

    for (const key of validKeys) {
      if (key in settings) {
        if (key === "reminderHours") {
          const hours = settings[key];
          if (typeof hours !== "number" || hours < 1 || hours > 48) {
            return NextResponse.json(
              { error: `Invalid value for ${key}` },
              { status: 400 },
            );
          }
        } else if (typeof settings[key] !== "boolean") {
          return NextResponse.json(
            { error: `Invalid value for ${key}` },
            { status: 400 },
          );
        }
      }
    }

    const updatedUser = await TenantUser.findByIdAndUpdate(
      decoded.tenantUserId,
      {
        $set: {
          notificationSettings: settings,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      settings: updatedUser.notificationSettings,
    });
  } catch (error) {
    console.error("Error saving notification settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
