import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { verifyRefreshToken, generateAccessToken } from "@/lib/auth/auth-server";

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
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const tenantId = user.tenantId?.toString() ?? null;
    const token = generateAccessToken(
      user._id.toString(), user.email, user.isAdmin,
      user.name ?? "", tenantId, user.isSuperAdmin ?? false,
      user.globalRole ?? "USER",
    );

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
