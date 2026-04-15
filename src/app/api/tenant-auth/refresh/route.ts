/**
 * POST /api/tenant-auth/refresh
 *
 * Refreshes the tenant access token using the HttpOnly tenant-refresh-token cookie.
 * Uses TenantUser ONLY. Must include tenantId in new token.
 * Never touches AuthUser.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { Tenant } from "@/models/Tenant";
import { verifyRefreshToken, generateAccessToken } from "@/lib/auth/auth-server";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("tenant-refresh-token")?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: "No tenant refresh token" }, { status: 401 });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
    }

    // Strict: reject anything that is not a tenant token
    if (decoded.type !== "tenant") {
      return NextResponse.json({ error: "Wrong token type — platform users must use /api/auth/refresh" }, { status: 401 });
    }

    await connectToDB();

    // decoded.id = TenantUser._id
    const tenantUser = await TenantUser.findById(decoded.id)
      .select("email name role tenantId isEmailVerified status")
      .lean<{
        _id: import("mongoose").Types.ObjectId;
        email: string;
        name: string;
        role: string;
        tenantId: import("mongoose").Types.ObjectId;
        isEmailVerified: boolean;
        status: string;
      }>();

    if (!tenantUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (tenantUser.status === "suspended") {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const tenant = await Tenant.findById(tenantUser.tenantId)
      .select("slug")
      .lean<{ slug: string }>();

    const isAdmin = ["OWNER", "ADMIN", "STAFF"].includes(tenantUser.role);

    const token = generateAccessToken(
      tenantUser._id.toString(),
      tenantUser.email,
      isAdmin,
      tenantUser.name,
      tenantUser._id.toString(),
      tenantUser.tenantId.toString(),
      false,
      tenantUser.role,
      tenant?.slug ?? null,
      "tenant",
    );

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
