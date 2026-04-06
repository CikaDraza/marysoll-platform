/**
 * GET /api/email/open?c=campaignId&u=userId
 *
 * Open tracking pixel for EmailCampaign (AI-generated campaigns).
 * Returns a 1x1 transparent GIF and logs the open event.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { CampaignEvent } from "@/models/CampaignEvent";
import { AudienceContact } from "@/models/AudienceContact";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const campaignId = searchParams.get("c");
  const userId = searchParams.get("u");
  const variantId = searchParams.get("v") as "A" | "B" | null;

  if (campaignId && userId) {
    try {
      await connectToDB();

      // The `u` param is AudienceContact._id (set by /api/internal/send-email via injectTracking).
      const contact = await AudienceContact.findById(userId).select("email").lean<{ email: string }>();
      if (contact) {
        await Promise.all([
          // Increment campaign open counter
          EmailCampaign.findByIdAndUpdate(campaignId, {
            $inc: { "metrics.opens": 1 },
          }),
          // Log event
          CampaignEvent.create({
            campaignId,
            tenantId: (
              await EmailCampaign.findById(campaignId).select("tenantId").lean<{ tenantId: string }>()
            )?.tenantId,
            recipientEmail: contact.email,
            recipientUserId: userId,
            type: "open",
            variantId: variantId ?? undefined,
            timestamp: new Date(),
          }),
          // Update AudienceContact engagement stats (opens worth 1 point each)
          AudienceContact.findByIdAndUpdate(userId, {
            $inc: { openCount: 1, engagementScore: 1 },
          }),
        ]);

        // Update A/B variant opened count if applicable
        if (variantId) {
          await EmailCampaign.findOneAndUpdate(
            { _id: campaignId, "abTest.variants.id": variantId },
            { $inc: { "abTest.variants.$.opened": 1 } },
          );
        }

        // Recalculate rates
        const campaign = await EmailCampaign.findById(campaignId).select("metrics").lean<{
          metrics: { delivered: number; opens: number; clicks: number };
        }>();
        if (campaign?.metrics) {
          const { delivered, opens, clicks } = campaign.metrics;
          const base = delivered || 1;
          await EmailCampaign.findByIdAndUpdate(campaignId, {
            $set: {
              "metrics.openRate": Math.round((opens / base) * 100 * 10) / 10,
              "metrics.clickRate": Math.round((clicks / (opens || 1)) * 100 * 10) / 10,
            },
          });
        }
      }
    } catch (err) {
      // Never block pixel response on errors
      console.error("[email/open] tracking error", err);
    }
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
  });
}
