import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { verifyToken } from "@/lib/auth/auth-server";

export async function GET(req: Request) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // decoded.id = TenantUser._id for tenant users
    const tenantUser = await TenantUser.findById(decoded.id)
      .select("-password -verificationToken -verificationTokenExpiry -resetPasswordToken -resetPasswordExpiry -pushSubscriptions")
      .lean<{
        _id: import("mongoose").Types.ObjectId;
        email: string;
        name: string;
        phone: string;
        role: string;
        isEmailVerified: boolean;
        isOnline: boolean;
        lastActive: Date;
        tenantId: import("mongoose").Types.ObjectId;
        createdAt: Date;
        updatedAt: Date;
      }>();

    if (!tenantUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...tenantUser,
      id: tenantUser._id.toString(),
      tenantUserId: tenantUser._id.toString(),
      tenantId: tenantUser.tenantId.toString(),
    });
  } catch (error: unknown) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error fetching user" },
      { status: 500 },
    );
  }
}
