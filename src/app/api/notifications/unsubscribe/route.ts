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

    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    await TenantUser.findByIdAndUpdate(decoded.tenantUserId, {
      $pull: { pushSubscriptions: { endpoint } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/notifications/unsubscribe:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
