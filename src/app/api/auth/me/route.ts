import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { requireAuth } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

/**
 * GET /api/auth/me
 *
 * Returns the full user profile from TenantUser.
 * decoded.id = TenantUser._id (tenant-scoped primary identifier).
 * SUPER_ADMIN has no TenantUser — returns JWT claims only.
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const auth = requireAuth(req) as { decoded: DecodedToken } | NextResponse;
    if (auth instanceof NextResponse) return auth;

    const { decoded } = auth;

    // SUPER_ADMIN: no TenantUser, return JWT claims
    if (decoded.isSuperAdmin) {
      return NextResponse.json({
        user: {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          globalRole: "SUPER_ADMIN",
          isAdmin: true,
          isSuperAdmin: true,
          tenantId: null,
          tenantUserId: null,
        },
      });
    }

    // Tenant user: load from TenantUser
    const tenantUser = await TenantUser.findById(decoded.id)
      .select("email name phone role isEmailVerified isOnline lastActive notificationSettings createdAt tenantId")
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
      }>();

    if (!tenantUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: tenantUser._id.toString(),
        tenantUserId: tenantUser._id.toString(),
        email: tenantUser.email,
        name: tenantUser.name,
        phone: tenantUser.phone,
        globalRole: tenantUser.role,
        isAdmin: ["OWNER", "ADMIN", "STAFF"].includes(tenantUser.role),
        isSuperAdmin: false,
        isEmailVerified: tenantUser.isEmailVerified,
        isOnline: tenantUser.isOnline,
        lastActive: tenantUser.lastActive,
        tenantId: tenantUser.tenantId.toString(),
        createdAt: tenantUser.createdAt,
      },
    });
  } catch (err) {
    console.error("GET /api/auth/me:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
