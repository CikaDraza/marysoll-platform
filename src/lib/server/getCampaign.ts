import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { INewsletterCampaign } from "@/types";

export async function getCampaign(slugPath: string): Promise<INewsletterCampaign> {
  await connectToDB();

  const cleanPath = slugPath.startsWith("/") ? slugPath : `/${slugPath}`;
  const slugId = cleanPath.split("/").filter(Boolean).at(-1);
  const blogSlug = cleanPath.replace(/^\/blog\/+/i, "");

  const campaign = await NewsletterCampaign.findOne({
    campaignType: "email-landing",
    $or: [
      { "landingPage.slug": cleanPath },
      { "landingPage.slug": blogSlug },
      { "landingPage.slug": `/${slugId}` },
      { "landingPage.slug": slugId },
      { ctaSlug: `/newsletter/${slugId}` },
      { ctaSlug: blogSlug },
    ],
  }).lean();

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  return JSON.parse(JSON.stringify(campaign)) as INewsletterCampaign;
}
