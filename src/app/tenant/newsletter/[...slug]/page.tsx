import CampaignClientShell from "@/components/CampaignClientShell";
import { normalizeCampaignSlug } from "@/helpers/slugNormalizer";
import { getCampaign } from "@/lib/server/getCampaign";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { slugId } = normalizeCampaignSlug(slug);

  try {
    const data = await getCampaign(slugId);
    const seo = data?.landingPage?.seo;

    return {
      title: seo?.title ?? "Marysoll Assistant AI",
      description: seo?.description ?? "AI Generation web app",
      keywords: seo?.keywords?.join(", "),
      openGraph: {
        title: seo?.ogTitle ?? seo?.title,
        description: seo?.ogDescription ?? seo?.description,
        images: seo?.ogImage ? [seo.ogImage] : [],
      },
    };
  } catch {
    return { title: "Marysoll Assistant AI" };
  }
}

export default async function NewsletterLandingPage({ params }: Props) {
  const { slug } = await params;
  const { slugId } = normalizeCampaignSlug(slug);

  const [data, cookieStore] = await Promise.all([
    getCampaign(slugId).catch(() => null),
    cookies(),
  ]);

  if (!data) notFound();

  const token = cookieStore.get("token")?.value ?? null;

  return <CampaignClientShell initialData={data} token={token} id={slugId} />;
}
