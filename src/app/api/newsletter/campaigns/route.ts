// app/api/newsletter/campaigns/route.ts
// GET /api/newsletter/campaigns
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireAdmin, type AdminAuthResult } from "@/lib/auth/auth-server";
import { requireFeature } from "@/lib/plans/planEnforcement";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { NewsletterLog } from "@/models/NewsletterLog";

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

    const normalizedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        const [openCount, clickCount] = await Promise.all([
          NewsletterLog.countDocuments({
            campaignId: campaign._id,
            openedAt: { $exists: true },
          }),
          NewsletterLog.countDocuments({
            campaignId: campaign._id,
            clickedAt: { $exists: true },
          }),
        ]);

        const normalizedOpenCount = Math.min(openCount, campaign.sentCount ?? 0);
        const normalizedClickCount = Math.min(
          clickCount,
          campaign.sentCount ?? 0,
        );

        if (
          normalizedOpenCount !== campaign.openCount ||
          normalizedClickCount !== campaign.clickCount
        ) {
          await NewsletterCampaign.updateOne(
            { _id: campaign._id, tenantId },
            {
              $set: {
                openCount: normalizedOpenCount,
                clickCount: normalizedClickCount,
              },
            },
          );
        }

        return {
          ...campaign,
          openCount: normalizedOpenCount,
          clickCount: normalizedClickCount,
        };
      }),
    );

    return NextResponse.json(normalizedCampaigns);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Greška pri učitavanju kampanja" },
      { status: 500 },
    );
  }
}
