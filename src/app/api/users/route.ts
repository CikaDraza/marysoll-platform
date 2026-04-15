import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { requireAuth } from "@/lib/auth/auth-server";
import { Types } from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    const auth = requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { decoded } = auth;

    if (!decoded.isAdmin && !decoded.isSuperAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (!decoded.tenantId) {
      return NextResponse.json({ error: "No tenant context" }, { status: 403 });
    }

    // email is now on TenantUser — no AuthUser join needed
    const users = await TenantUser.find(
      {
        tenantId: new Types.ObjectId(decoded.tenantId),
        role: { $nin: ["OWNER", "ADMIN"] },
      },
      {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        role: 1,
        isOnline: 1,
        isEmailVerified: 1,
        lastActive: 1,
        createdAt: 1,
      },
    )
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error fetching users" }, { status: 500 });
  }
}
