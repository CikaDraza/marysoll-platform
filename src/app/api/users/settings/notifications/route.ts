// app/api/user/settings/notifications/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/auth-server";
import { User } from "@/models/User";

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
    const user = verifyToken(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Pronađi korisnika (BILO DA JE ADMIN ILI KLIJENT)
    const dbUser = await User.findById(user.id);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Vrati korisnikove postavke ili default
    return NextResponse.json(dbUser.notificationSettings || DEFAULT_SETTINGS);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
