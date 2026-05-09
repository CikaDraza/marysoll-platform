import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { SalonInternalChat } from "@/models/SalonInternalChat";
import { Notification } from "@/models/Notification";
import mongoose from "mongoose";

function participantKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// POST /api/admin/chat/[contactId]/read — mark chat as read
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  const { contactId } = await params;
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();

  const myId = decoded.tenantUserId!;
  const [p0, p1] = participantKey(myId, contactId);

  const chat = await SalonInternalChat.findOne({
    tenantId: decoded.tenantId,
    "participants.0": new mongoose.Types.ObjectId(p0),
    "participants.1": new mongoose.Types.ObjectId(p1),
  });

  if (chat) {
    chat.unreadCount.set(myId, 0);
    chat.markModified("unreadCount");
    await chat.save();
  }

  // Mark related chat notifications as read
  await Notification.updateMany(
    {
      tenantId: decoded.tenantId,
      recipientProfileId: myId,
      type: "chat_message",
      isRead: false,
    },
    { $set: { isRead: true } },
  );

  return NextResponse.json({ success: true });
}
