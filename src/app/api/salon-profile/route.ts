import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await connectToDB();
    const auth: AdminAuthResult = await requireAdmin(request);
    if (!auth.success) {
      return auth.response;
    }

    const tenantId = auth.decoded.tenantId;
    const profile = tenantId
      ? await SalonProfile.findOne({ tenantId }).lean()
      : await SalonProfile.findOne({}).lean();

    return NextResponse.json({ success: true, data: profile ?? null });
  } catch (err) {
    console.error("GET /api/salon-profile:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
