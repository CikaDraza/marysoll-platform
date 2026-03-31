import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { User } from "@/models/User";
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
      ? await SalonProfile.findOne({ tenantId })
      : await SalonProfile.findOne({});

    if (!profile) {
      return NextResponse.json({ success: true, data: null });
    }

    // Backfill: if SalonProfile.phone is empty, pull it from the owner's User doc
    if (!profile.phone) {
      const owner = await User.findById(auth.decoded.id).select("phone").lean() as
        | { phone?: string }
        | null;
      if (owner?.phone) {
        profile.phone = owner.phone;
        await profile.save();
      }
    }

    return NextResponse.json({ success: true, data: profile.toObject() });
  } catch (err) {
    console.error("GET /api/salon-profile:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
