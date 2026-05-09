import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

// POST /api/superadmin/chat/[tenantId]/read — mark unread as read for superadmin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const authResult = requireSuperAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  await connectToDB();

  await SuperAdminChat.updateOne(
    { tenantId },
    { $set: { unreadBySuperAdmin: 0 } },
  );

  return NextResponse.json({ success: true });
}
