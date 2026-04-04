import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

/**
 * GET /api/auth/me
 * Returns the full user profile from DB (fields not in JWT token).
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const auth = requireAuth(req) as { decoded: DecodedToken } | NextResponse;
    if (auth instanceof NextResponse) return auth;

    const user = await User.findById(auth.decoded.id)
      .select(
        "name email phone marketingPhone newsletterEmail contactEmail globalRole",
      )
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("GET /api/auth/me:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
