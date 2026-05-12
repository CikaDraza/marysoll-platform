import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { Notification } from "@/models/Notification";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectToDB();

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const query: { recipientProfileId: string; isRead?: boolean } = {
    recipientProfileId: auth.decoded.id,
  };
  if (unreadOnly) query.isRead = false;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(50);

  return NextResponse.json(notifications);
}
