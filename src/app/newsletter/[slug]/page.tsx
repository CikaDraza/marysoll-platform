import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { CampaignLayoutEngine } from "@/components/layout/CampaignLayoutEngine";
import { LandingBlock } from "@/types/landing-blocks";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NewsletterLandingPage({ params }: Props) {
  const { slug } = await params;
  await connectToDB();

  const campaign = await NewsletterCampaign.findOne({
    "landingPage.slug": slug,
    "landingPage.status": "published",
  }).lean();

  if (!campaign) notFound();

  const c = campaign as Record<string, unknown>;
  const lp = c.landingPage as { layout?: LandingBlock[] };

  return (
    <div className="min-h-screen">
      <CampaignLayoutEngine blocks={lp.layout || []} />
    </div>
  );
}
