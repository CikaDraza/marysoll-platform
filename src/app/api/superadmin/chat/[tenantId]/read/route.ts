import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { Notification } from "@/models/Notification";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

// POST /api/superadmin/chat/[tenantId]/read — mark unread as read for superadmin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const authResult = requireSuperAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const { decoded } = authResult;

  await connectToDB();

  await SuperAdminChat.updateOne(
    { tenantId },
    // Reset email throttle → sledeća poruka salona odmah šalje email.
    { $set: { unreadBySuperAdmin: 0, superAdminEmailThrottleAt: null } },
  );

  // Označi superadminove chat notifikacije za ovaj salon kao pročitane.
  await Notification.updateMany(
    {
      tenantId,
      recipientProfileId: decoded.id,
      type: "chat_message",
      isRead: false,
    },
    { $set: { isRead: true } },
  );

  return NextResponse.json({ success: true });
}
