import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { TenantUser } from "@/models/TenantUser";
import { Notification } from "@/models/Notification";
import mongoose from "mongoose";

// GET /api/admin/chat/superadmin — returns chat messages with superadmin
export async function GET(req: NextRequest) {
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();
  const chat = await SuperAdminChat.findOne({ tenantId: decoded.tenantId }).lean();
  return NextResponse.json(chat ?? { messages: [], unreadBySuperAdmin: 0, unreadByOwner: 0 });
}

// POST /api/admin/chat/superadmin — send message to superadmin
export async function POST(req: NextRequest) {
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();

  const body = await req.json();
  const { content, attachments = [] } = body as { content: string; attachments: Array<{ url: string; type: string; name: string; size: number }> };

  if (!content?.trim() && attachments.length === 0) {
    return NextResponse.json({ error: "Poruka ne može biti prazna" }, { status: 400 });
  }

  const me = await TenantUser.findById(decoded.tenantUserId)
    .select("name role")
    .lean<{ name: string; role: string }>();

  let chat = await SuperAdminChat.findOne({ tenantId: decoded.tenantId });
  if (!chat) {
    chat = new SuperAdminChat({
      tenantId: decoded.tenantId,
      ownerId: decoded.tenantUserId,
      messages: [],
      unreadBySuperAdmin: 0,
      unreadByOwner: 0,
    });
  }

  (chat.messages as Array<{ senderId: mongoose.Types.ObjectId | string; senderRole: string; message: string; isRead: boolean; timestamp: Date }>).push({
    senderId: decoded.tenantUserId!,
    senderRole: "owner",
    message: content?.trim() ?? "",
    isRead: false,
    timestamp: new Date(),
  });

  chat.unreadBySuperAdmin += 1;
  chat.lastMessageAt = new Date();
  await chat.save();

  // Notify superadmin via Notification (generic since superadmin uses AuthUser not TenantUser)
  // SuperAdmin checks their own notification system — we skip tenant Notification here

  return NextResponse.json({ success: true });
}
