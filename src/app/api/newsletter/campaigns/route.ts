// app/api/newsletter/campaigns/route.ts
// GET /api/newsletter/campaigns
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";

export async function GET(req: NextRequest) {
  try {
    const auth: AdminAuthResult = await requireAdmin(req);
    if (!auth.success) return auth.response;

    const tenantId = auth.decoded.tenantId;

    const denied = await requireFeature(tenantId, "newsletterCampaigns");
    if (denied) return denied;

    await connectToDB();
    const campaigns = await NewsletterCampaign.find({ tenantId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(campaigns);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Greška pri učitavanju kampanja" },
      { status: 500 },
    );
  }
}
