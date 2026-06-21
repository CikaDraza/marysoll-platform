import CampaignClientShell from "@/components/CampaignClientShell";
import { TenantPageShell } from "@/components/themes/TenantPageShell";
import { Theme8BlogPost } from "@/components/themes/theme-8/pages/Theme8BlogPost";
import { normalizeCampaignSlug } from "@/helpers/slugNormalizer";
import { getCampaign } from "@/lib/server/getCampaign";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { fullPath } = normalizeCampaignSlug(slug);
  const tenantId = (await headers()).get("x-tenant-id");

  if (!tenantId) return { title: "Marysoll Assistant AI" };

  try {
    const data = await getCampaign(fullPath, tenantId);
    const seo = data?.landingPage?.seo;

    return {
      title: seo?.title ?? "Marysoll Assistant AI",
      description: seo?.description ?? "",
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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const { slugId, fullPath } = normalizeCampaignSlug(slug);
  const headerStore = await headers();
  const tenantId = headerStore.get("x-tenant-id");
  const tenantSlug = headerStore.get("x-tenant-slug") ?? "";
  const base = headerStore.get("x-tenant-base-path") ?? "";

  if (!tenantId) notFound();

  const [data, cookieStore, profile] = await Promise.all([
    getCampaign(fullPath, tenantId).catch(() => null),
    cookies(),
    fetchPublicSalonProfile(tenantSlug),
  ]);

  if (!data) notFound();

  const token = cookieStore.get("token")?.value ?? null;

  return (
    <TenantPageShell tenantSlug={tenantSlug}>
      {profile?.landingTheme === "theme-8" ? (
        <Theme8BlogPost tenantSlug={base ? tenantSlug : undefined}>
          <CampaignClientShell initialData={data} token={token} id={slugId} />
        </Theme8BlogPost>
      ) : (
        <CampaignClientShell initialData={data} token={token} id={slugId} />
      )}
    </TenantPageShell>
  );
}
