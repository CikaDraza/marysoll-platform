import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { verifyToken } from "@/lib/auth/auth-server";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.tenantUserId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const { subscription } = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
    }

    const user = (await TenantUser.findById(decoded.tenantUserId)
      .select("pushSubscriptions")
      .lean()) as { pushSubscriptions?: { endpoint: string }[] } | null;

    const isActive = user?.pushSubscriptions?.some(
      (s) => s.endpoint === subscription.endpoint,
    ) ?? false;

    // If not stored yet (e.g. user re-subscribed on new device), save it
    if (!isActive && subscription.keys) {
      await TenantUser.findByIdAndUpdate(decoded.tenantUserId, {
        $addToSet: {
          pushSubscriptions: {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            createdAt: new Date(),
          },
        },
      });
    }

    return NextResponse.json({ success: true, isActive: isActive || !!subscription.keys });
  } catch (error) {
    console.error("POST /api/notifications/check-subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
