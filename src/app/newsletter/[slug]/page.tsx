import { connectToDB } from "@/lib/db/mongodb";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
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
  const lp = c.landingPage as Record<string, unknown>;

  return (
    <div className="min-h-screen">
      {/* CampaignLayoutEngine renders lp.layout blocks */}
      <pre className="p-4 text-xs opacity-50">
        {JSON.stringify(lp.seo, null, 2)}
      </pre>
    </div>
  );
}
