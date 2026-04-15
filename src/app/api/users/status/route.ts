// app/api/users/status/route.ts
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

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    if (!decoded.tenantUserId) {
      return NextResponse.json({ success: true });
    }

    const { isOnline } = await req.json();

    const updatedUser = await TenantUser.findByIdAndUpdate(
      decoded.tenantUserId,
      {
        isOnline,
        lastActive: new Date(),
      },
      { new: true },
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Status updated",
      user: {
        id: updatedUser._id,
        isOnline: updatedUser.isOnline,
        lastActive: updatedUser.lastActive,
      },
    });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
