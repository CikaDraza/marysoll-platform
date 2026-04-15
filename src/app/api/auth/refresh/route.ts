/**
 * POST /api/auth/refresh
 *
 * Platform-only token refresh. Uses AuthUser ONLY.
 * Reads platform-refresh-token (HttpOnly) cookie.
 * Tenant users MUST use /api/tenant-auth/refresh instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { AuthUser } from "@/models/AuthUser";
import { verifyRefreshToken, generateAccessToken } from "@/lib/auth/auth-server";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("platform-refresh-token")?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: "No platform refresh token" }, { status: 401 });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
    }

    // Strict: reject anything that is not a platform token
    if (decoded.type !== "platform") {
      return NextResponse.json(
        { error: "Wrong token type — tenant users must use /api/tenant-auth/refresh" },
        { status: 401 },
      );
    }

    if (!decoded.isSuperAdmin) {
      return NextResponse.json({ error: "Platform refresh requires SUPER_ADMIN token" }, { status: 403 });
    }

    await connectToDB();

    const authUser = await AuthUser.findById(decoded.id)
      .select("email platformRole")
      .lean<{ _id: import("mongoose").Types.ObjectId; email: string; platformRole: string | null }>();

    if (!authUser || authUser.platformRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "User not found or insufficient role" }, { status: 401 });
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
      "platform",
    );

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
