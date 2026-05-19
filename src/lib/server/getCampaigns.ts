import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { INewsletterCampaign } from "@/types";

export async function getCampaigns(
  tenantId: string,
  page: number,
  limit: number,
): Promise<{ campaigns: INewsletterCampaign[]; total: number }> {
  await connectToDB();

  const filter = {
    tenantId,
    campaignType: "email-landing",
    "landingPage.enabled": true,
    "landingPage.status": "published",
  };

  const [campaigns, total] = await Promise.all([
    NewsletterCampaign.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    NewsletterCampaign.countDocuments(filter),
  ]);

  return {
    campaigns: JSON.parse(JSON.stringify(campaigns)) as INewsletterCampaign[],
    total,
  };
}
