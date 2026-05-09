import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

// DELETE /api/superadmin/chat/[tenantId]/message/[messageId] — soft-delete own message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; messageId: string }> }
) {
  const { tenantId, messageId } = await params;
  const authResult = requireSuperAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const { decoded } = authResult;

  await connectToDB();

  const chat = await SuperAdminChat.findOne({ tenantId });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const msg = chat.messages.id(messageId);
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  if (msg.senderId.toString() !== decoded.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  msg.isDeleted = true;
  msg.message = "";
  (msg as typeof msg & { attachments: unknown[] }).attachments = [];

  await chat.save();

  return NextResponse.json({ success: true });
}
