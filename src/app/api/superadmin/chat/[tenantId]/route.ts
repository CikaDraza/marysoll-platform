import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { requireSuperAdmin, requireAuth } from "@/lib/auth/auth-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  // Allow both superadmin and the salon owner
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  await connectToDB();
  let chat = await SuperAdminChat.findOne({ tenantId }).lean();
  if (!chat) {
    return NextResponse.json({ messages: [] });
  }
  return NextResponse.json(chat);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { decoded } = authResult;

  await connectToDB();
  const { message } = await request.json();

  const senderRole = decoded.isSuperAdmin ? "superadmin" : "owner";

  let chat = await SuperAdminChat.findOne({ tenantId });
  if (!chat) {
    chat = new SuperAdminChat({
      tenantId,
      ownerId: decoded.id,
      messages: [],
      unreadBySuperAdmin: 0,
      unreadByOwner: 0,
      lastMessageAt: new Date(),
    });
  }

  chat.messages.push({
    senderId: decoded.id,
    senderRole,
    message,
    isRead: false,
    timestamp: new Date(),
  } as Parameters<typeof chat.messages.push>[0]);

  if (senderRole === "owner") chat.unreadBySuperAdmin += 1;
  else chat.unreadByOwner += 1;

  chat.lastMessageAt = new Date();
  await chat.save();

  return NextResponse.json({ success: true });
}
