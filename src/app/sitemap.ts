import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getCanonicalUrl, getPublicSiteContext } from "@/lib/seo/public-site";
import { listPublicEducationContent } from "@/lib/education/publicContent";

export const dynamic = "force-dynamic";

const tenantRoutes = [
  { path: "/", changeFrequency: "daily", priority: 0.9 },
  { path: "/usluge", changeFrequency: "weekly", priority: 0.8 },
  { path: "/termini", changeFrequency: "daily", priority: 0.8 },
  { path: "/blogs", changeFrequency: "weekly", priority: 0.6 },
  { path: "/edukacija", changeFrequency: "weekly", priority: 0.7 },
  { path: "/pravila-zakazivanja", changeFrequency: "monthly", priority: 0.4 },
  { path: "/politika-privatnosti", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.3 },
] satisfies Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}>;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const context = getPublicSiteContext({
    domainType: h.get("x-domain-type") ?? "marketing",
    tenantSlug: h.get("x-tenant-slug") ?? "",
    tenantCustomDomain: h.get("x-tenant-custom-domain") ?? "",
    publicHost: h.get("x-public-host") ?? "",
  });
  const lastModified = new Date();

  if (context.kind === "TENANT") {
    // Svaki javno otkriven članak ima svoju adresu i rangira se na njoj, pa
    // ulazi u sitemap pojedinačno. Isti upit koji koristi i javna lista — dakle
    // `private` ovde ne može ni da se pojavi.
    const articles = await listPublicEducationContent(h.get("x-tenant-id"));

    return [
      ...tenantRoutes.map((route) => ({
        url: getCanonicalUrl(context, route.path),
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })),
      ...articles.map((article) => ({
        url: getCanonicalUrl(context, `/edukacija/${article.slug}`),
        // Datum objave je tačniji signal od vremena generisanja sitemap-a.
        lastModified: new Date(article.publishedAt),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  }

  // Platform sitemap deliberately never lists tenant websites.
  return [
    { url: getCanonicalUrl(context, "/"), lastModified, changeFrequency: "daily", priority: 1 },
    { url: getCanonicalUrl(context, "/pricing"), lastModified, changeFrequency: "weekly", priority: 0.8 },
  ];
}
