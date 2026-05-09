import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { SalonInternalChat } from "@/models/SalonInternalChat";
import { IChatMessage } from "@/models/SalonInternalChat";
import mongoose from "mongoose";

function participantKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// DELETE /api/admin/chat/[contactId]/message/[messageId] — soft-delete own message
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string; messageId: string }> },
) {
  const { contactId, messageId } = await params;
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

  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  const msg = (chat.messages as mongoose.Types.DocumentArray<IChatMessage>).id(messageId);
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  if (msg.senderId.toString() !== myId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  msg.isDeleted = true;
  msg.content = "";
  msg.attachments = [];
  await chat.save();

  return NextResponse.json({ success: true });
}
