import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/auth/auth-server";
import { TenantUser } from "@/models/TenantUser";
import { SalonInternalChat } from "@/models/SalonInternalChat";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import type { AdminAuthResult } from "@/lib/auth/auth-server";

// GET /api/admin/chat/contacts
// Returns contacts for the current admin/owner/staff:
// 1. SuperAdmin (using SuperAdminChat unread count)
// 2. Other OWNER/ADMIN users in the same salon
// 3. STAFF with permissions.chat === true
export async function GET(req: NextRequest) {
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();

  const me = await TenantUser.findById(decoded.tenantUserId)
    .select("_id role permissions tenantId name email")
    .lean<{ _id: import("mongoose").Types.ObjectId; role: string; permissions: Record<string, unknown> | null; tenantId: import("mongoose").Types.ObjectId; name: string; email: string }>();

  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const tenantId = me.tenantId.toString();
  const myId = me._id.toString();

  // Check if current user has chat access
  const myRole = me.role;
  const hasChatAccess =
    myRole === "OWNER" ||
    myRole === "ADMIN" ||
    (myRole === "STAFF" && (me.permissions as Record<string, unknown> | null)?.chat === true);

  if (!hasChatAccess) {
    return NextResponse.json({ contacts: [] });
  }

  // 1. SuperAdmin contact — read unread count from SuperAdminChat
  const superAdminChat = await SuperAdminChat.findOne({ tenantId })
    .select("unreadByOwner lastMessageAt messages")
    .lean<{ unreadByOwner: number; lastMessageAt: Date; messages: Array<{ senderRole: string; message: string; timestamp: Date }> }>();

  const superAdminUnread = superAdminChat?.unreadByOwner ?? 0;
  const superAdminLastMsg = superAdminChat?.messages?.slice(-1)[0];

  const contacts: Array<{
    id: string;
    name: string;
    role: string;
    email?: string;
    unread: number;
    lastMessage?: string;
    lastMessageAt?: Date;
    isSuperAdmin?: boolean;
  }> = [
    {
      id: "superadmin",
      name: "SuperAdmin",
      role: "superadmin",
      unread: superAdminUnread,
      lastMessage: superAdminLastMsg?.message,
      lastMessageAt: superAdminLastMsg?.timestamp,
      isSuperAdmin: true,
    },
  ];

  // 2. Other salon users (OWNER, ADMIN, STAFF with chat perm)
  const salonUsers = await TenantUser.find({
    tenantId,
    _id: { $ne: me._id },
    role: { $in: ["OWNER", "ADMIN", "STAFF"] },
    status: "active",
  })
    .select("_id name email role permissions")
    .lean<Array<{ _id: import("mongoose").Types.ObjectId; name: string; email: string; role: string; permissions: Record<string, unknown> | null }>>();

  const eligibleUsers = salonUsers.filter((u) => {
    if (u.role === "OWNER" || u.role === "ADMIN") return true;
    return (u.permissions as Record<string, unknown> | null)?.chat === true;
  });

  // Batch-fetch unread counts for internal chats
  const internalChats = await SalonInternalChat.find({
    tenantId,
    participants: me._id,
  })
    .select("participants unreadCount lastMessageAt messages")
    .lean<Array<{ participants: import("mongoose").Types.ObjectId[]; unreadCount: Map<string, number> | Record<string, number>; lastMessageAt: Date; messages: Array<{ content: string; timestamp: Date; isDeleted: boolean }> }>>();

  for (const u of eligibleUsers) {
    const uid = u._id.toString();
    const chat = internalChats.find((c) =>
      c.participants.some((p) => p.toString() === uid),
    );

    const unreadRaw = chat?.unreadCount;
    let unread = 0;
    if (unreadRaw) {
      if (unreadRaw instanceof Map) {
        unread = unreadRaw.get(myId) ?? 0;
      } else {
        unread = (unreadRaw as Record<string, number>)[myId] ?? 0;
      }
    }

    const lastMsg = chat?.messages?.filter((m) => !m.isDeleted).slice(-1)[0];

    contacts.push({
      id: uid,
      name: u.name,
      role: u.role,
      email: u.email,
      unread,
      lastMessage: lastMsg?.content,
      lastMessageAt: lastMsg?.timestamp ?? chat?.lastMessageAt,
    });
  }

  return NextResponse.json({ contacts });
}
