// api/notifications/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { verifyToken } from "@/lib/auth/auth-server";
import "@/models/Appointment";
import "@/models/Testimonial";
import { Notification } from "@/models/Notification";

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

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const query: { recipientProfileId: string; isRead?: boolean } = {
      recipientProfileId: user.tenantUserId ?? user.id,
    };
    if (unreadOnly) {
      query.isRead = false;
    }

    // BEZ populate: `appointmentId`/`testimonialId` se koriste ISKLJUČIVO kao
    // id u deep-link URL-u zvonca. Populate je od njih pravio cele dokumente,
    // pa je `?appointmentId=${...}` u linku davao "[object Object]" — server
    // je takav id odbijao, i skok na termin nikad nije radio.
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Error fetching notifications" },
      { status: 500 },
    );
  }
}
