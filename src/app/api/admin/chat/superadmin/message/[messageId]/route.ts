import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import mongoose from "mongoose";

// DELETE /api/admin/chat/superadmin/message/[messageId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const { messageId } = await params;
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();

  const chat = await SuperAdminChat.findOne({ tenantId: decoded.tenantId });
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  const msg = (chat.messages as Array<{ _id: mongoose.Types.ObjectId; senderId: mongoose.Types.ObjectId; message: string; isRead: boolean; senderRole: string; timestamp: Date }>).find(
    (m) => m._id.toString() === messageId,
  );
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  // Only allow deleting own messages
  if (msg.senderId.toString() !== decoded.tenantUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft delete — set content to empty marker
  msg.message = "";
  (msg as unknown as Record<string, unknown>).isDeleted = true;
  await chat.save();

  return NextResponse.json({ success: true });
}
