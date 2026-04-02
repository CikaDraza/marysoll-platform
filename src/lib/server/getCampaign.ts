import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { INewsletterCampaign } from "@/types";

export async function getCampaign(slugId: string): Promise<INewsletterCampaign> {
  await connectToDB();

  const campaign = await NewsletterCampaign.findOne({
    campaignType: "email-landing",
    $or: [
      { "landingPage.slug": `/${slugId}` },
      { ctaSlug: `/newsletter/${slugId}` },
    ],
  }).lean();

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  return JSON.parse(JSON.stringify(campaign)) as INewsletterCampaign;
}
