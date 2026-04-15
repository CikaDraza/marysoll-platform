import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import { requireAuth } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

/**
 * PATCH /api/auth/update-profile
 * Body: { name?: string; phone?: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    await connectToDB();
    const auth = (await requireAuth(req)) as
      | { decoded: DecodedToken }
      | NextResponse;
    if (auth instanceof NextResponse) return auth;

    const { name, phone } = await req.json();

    const update: Record<string, string> = {};
    if (name?.trim()) update.name = name.trim();
    if (phone?.trim()) update.phone = phone.trim();

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    if (!auth.decoded.tenantUserId) {
      return NextResponse.json({ error: "No tenant context." }, { status: 403 });
    }

    const tenantUser = await TenantUser.findByIdAndUpdate(
      auth.decoded.tenantUserId,
      { $set: update },
      { new: true, select: "name phone role" },
    ).lean();

    if (!tenantUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: tenantUser });
  } catch (err) {
    console.error("PATCH /api/auth/update-profile:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
