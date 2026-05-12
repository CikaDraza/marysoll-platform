import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { Notification } from "@/models/Notification";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectToDB();

  const { notificationIds, markAll } = await req.json();
  const recipientId = auth.decoded.id;

  if (markAll) {
    await Notification.updateMany(
      { recipientProfileId: recipientId, isRead: false },
      { $set: { isRead: true } },
    );
  } else if (notificationIds?.length > 0) {
    await Notification.updateMany(
      { _id: { $in: notificationIds }, recipientProfileId: recipientId },
      { $set: { isRead: true } },
    );
  }

  return NextResponse.json({ success: true });
}
