/**
 * GET /api/email/click?c=campaignId&u=userId&url=ENCODED_URL
 *
 * Click tracking redirect for EmailCampaign (AI-generated campaigns).
 * Logs the click event and redirects to the original URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { EmailCampaign } from "@/models/EmailCampaign";
import { CampaignEvent } from "@/models/CampaignEvent";
import { User } from "@/models/User";

const FALLBACK = process.env.NEXT_PUBLIC_APP_URL ?? "https://marysoll.com";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const campaignId = searchParams.get("c");
  const userId = searchParams.get("u");
  const url = searchParams.get("url");
  const variantId = searchParams.get("v") as "A" | "B" | null;

  if (campaignId && userId && url) {
    try {
      await connectToDB();

      const user = await User.findById(userId).select("email").lean<{ email: string }>();
      if (user) {
        const campaignDoc = await EmailCampaign.findById(campaignId)
          .select("tenantId metrics")
          .lean<{ tenantId: string; metrics: { opens: number; clicks: number; delivered: number } }>();

        if (campaignDoc) {
          await Promise.all([
            EmailCampaign.findByIdAndUpdate(campaignId, {
              $inc: { "metrics.clicks": 1 },
            }),
            CampaignEvent.create({
              campaignId,
              tenantId: campaignDoc.tenantId,
              recipientEmail: user.email,
              recipientUserId: userId,
              type: "click",
              variantId: variantId ?? undefined,
              url,
              timestamp: new Date(),
            }),
          ]);

          // Recalculate click rate
          const opens = (campaignDoc.metrics?.opens ?? 0) + 1;
          const clicks = (campaignDoc.metrics?.clicks ?? 0) + 1;
          if (opens > 0) {
            await EmailCampaign.findByIdAndUpdate(campaignId, {
              $set: {
                "metrics.clickRate": Math.round((clicks / opens) * 100 * 10) / 10,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error("[email/click] tracking error", err);
    }
  }

  if (url) {
    try {
      const redirectTo = new URL(url).toString();
      return NextResponse.redirect(redirectTo);
    } catch {
      // fall through
    }
  }

  return NextResponse.redirect(FALLBACK);
}
