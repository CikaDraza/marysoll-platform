import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { Tenant } from "@/models/Tenant";
import { verifyRefreshToken, generateAccessToken } from "@/lib/auth/auth-server";

/**
 * POST /api/auth/refresh
 *
 * Refreshes the access token using the HttpOnly refreshToken cookie.
 * For tenant users: re-reads TenantUser to get current role/name.
 * For SUPER_ADMIN: re-reads AuthUser.
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    await connectToDB();

    // ── SUPER_ADMIN ────────────────────────────────────────────────────────
    if (decoded.isSuperAdmin) {
      const authUser = await AuthUser.findById(decoded.id)
        .select("email platformRole")
        .lean<{ _id: import("mongoose").Types.ObjectId; email: string; platformRole: string | null }>();

      if (!authUser || authUser.platformRole !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "User not found" }, { status: 401 });
      }

      const token = generateAccessToken(
        authUser._id.toString(),
        authUser.email,
        true,
        "Super Admin",
        null,
        null,
        true,
        "SUPER_ADMIN",
        null,
      );
      return NextResponse.json({ token });
    }

    // ── Tenant user ────────────────────────────────────────────────────────
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
    );

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
