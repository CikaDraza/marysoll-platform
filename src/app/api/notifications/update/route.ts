// api/notifications/update/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/auth-server";
import "@/models/Appointment";
import "@/models/Testimonial";
import { Notification } from "@/models/Notification";

export async function PUT(req: Request) {
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

    const { notificationIds, markAll } = await req.json();

    if (markAll) {
      await Notification.updateMany(
        { userId: user.id, isRead: false },
        { $set: { isRead: true } },
      );
    } else if (notificationIds?.length > 0) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId: user.id },
        { $set: { isRead: true } },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Error updating notifications" },
      { status: 500 },
    );
  }
}
