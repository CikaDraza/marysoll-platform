import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { INewsletterCampaign } from "@/types";

function safeDecodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function getCampaign(
  slugPath: string,
  tenantId: string,
): Promise<INewsletterCampaign> {
  await connectToDB();

  const cleanPath = slugPath.startsWith("/") ? slugPath : `/${slugPath}`;
  const slugId = safeDecodeSlug(cleanPath.split("/").filter(Boolean).at(-1) ?? "");
  const blogSlug = safeDecodeSlug(cleanPath.replace(/^\/blog\/+/i, ""));

  const campaign = await NewsletterCampaign.findOne({
    tenantId,
    campaignType: "email-landing",
    $or: [
      { "landingPage.slug": cleanPath },
      { "landingPage.slug": blogSlug },
      { "landingPage.slug": `/${slugId}` },
      { "landingPage.slug": slugId },
      { ctaSlug: `/blog/${slugId}` },
      { ctaSlug: blogSlug },
    ],
  }).lean();

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  return JSON.parse(JSON.stringify(campaign)) as INewsletterCampaign;
}
