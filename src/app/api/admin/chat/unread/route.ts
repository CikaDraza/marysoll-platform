import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { SalonInternalChat } from "@/models/SalonInternalChat";
import { SuperAdminChat } from "@/models/SuperAdminChat";

// GET /api/admin/chat/unread — returns total unread count across all chats
export async function GET(req: NextRequest) {
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();

  const myId = decoded.tenantUserId!;

  // Internal chats unread
  const internalChats = await SalonInternalChat.find({
    tenantId: decoded.tenantId,
    participants: myId,
  })
    .select("unreadCount")
    .lean<Array<{ unreadCount: Map<string, number> | Record<string, number> }>>();

  let internalUnread = 0;
  for (const chat of internalChats) {
    const raw = chat.unreadCount;
    if (raw instanceof Map) {
      internalUnread += raw.get(myId) ?? 0;
    } else {
      internalUnread += (raw as Record<string, number>)[myId] ?? 0;
    }
  }

  // Superadmin chat unread
  const superAdminChat = await SuperAdminChat.findOne({ tenantId: decoded.tenantId })
    .select("unreadByOwner")
    .lean<{ unreadByOwner: number }>();

  const superAdminUnread = superAdminChat?.unreadByOwner ?? 0;

  return NextResponse.json({ total: internalUnread + superAdminUnread });
}
