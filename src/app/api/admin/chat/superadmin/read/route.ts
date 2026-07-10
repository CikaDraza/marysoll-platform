import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { Notification } from "@/models/Notification";

// POST /api/admin/chat/superadmin/read — mark superadmin chat as read by owner
export async function POST(req: NextRequest) {
  const authResult: AdminAuthResult = await requireAdmin(req);
  if (!authResult.success) return authResult.response;
  const { decoded } = authResult;

  await connectToDB();

  await SuperAdminChat.updateOne(
    { tenantId: decoded.tenantId },
    // Reset email throttle → sledeća poruka superadmina odmah šalje email.
    { $set: { unreadByOwner: 0, ownerEmailThrottleAt: null } },
  );

  // Mark related chat notifications as read
  await Notification.updateMany(
    {
      tenantId: decoded.tenantId,
      recipientProfileId: decoded.tenantUserId,
      type: "chat_message",
      isRead: false,
    },
    { $set: { isRead: true } },
  );

  return NextResponse.json({ success: true });
}
