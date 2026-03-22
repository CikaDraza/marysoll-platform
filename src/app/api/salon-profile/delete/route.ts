import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { requireAdmin } from "@/lib/auth/auth-server";
import { DecodedToken } from "@/types/auth/types";

export async function DELETE(req: NextRequest) {
  try {
    await connectToDB();
    const auth = (await requireAdmin(req)) as
      | { decoded: DecodedToken }
      | NextResponse;
    if (auth instanceof NextResponse) return auth;
    const tenantId = auth.decoded.tenantId;

    const filter = tenantId ? { tenantId } : {};
    await SalonProfile.findOneAndDelete(filter);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/salon-profile/delete:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
