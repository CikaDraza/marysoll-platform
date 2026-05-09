import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { requireAuth } from "@/lib/auth/auth-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const { decoded } = authResult;

  await connectToDB();

  const chat = await SuperAdminChat.findOne({ tenantId });
  if (!chat) {
    return NextResponse.json({ messages: [] });
  }

  // Mark as read for the side that is fetching
  if (decoded.isSuperAdmin && chat.unreadBySuperAdmin > 0) {
    chat.unreadBySuperAdmin = 0;
    await chat.save();
  }

  return NextResponse.json(chat.toObject());
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

  const body = await request.json() as { content?: string; message?: string; attachments?: Array<{ url: string; type: string; name: string; size: number }> };
  const content = (body.content ?? body.message ?? "").trim();
  const attachments = body.attachments ?? [];

  if (!content && attachments.length === 0) {
    return NextResponse.json({ error: "Poruka ne može biti prazna" }, { status: 400 });
  }

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
    message: content,
    attachments,
    isDeleted: false,
    isRead: false,
    timestamp: new Date(),
  } as Parameters<typeof chat.messages.push>[0]);

  if (senderRole === "owner") chat.unreadBySuperAdmin += 1;
  else chat.unreadByOwner += 1;

  chat.lastMessageAt = new Date();
  await chat.save();

  return NextResponse.json({ success: true });
}
