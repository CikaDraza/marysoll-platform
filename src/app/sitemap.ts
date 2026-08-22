import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getCanonicalUrl, getPublicSiteContext } from "@/lib/seo/public-site";

export const dynamic = "force-dynamic";

const tenantRoutes = [
  { path: "/", changeFrequency: "daily", priority: 0.9 },
  { path: "/usluge", changeFrequency: "weekly", priority: 0.8 },
  { path: "/termini", changeFrequency: "daily", priority: 0.8 },
  { path: "/blogs", changeFrequency: "weekly", priority: 0.6 },
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
    return tenantRoutes.map((route) => ({
      url: getCanonicalUrl(context, route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }));
  }

  // Platform sitemap deliberately never lists tenant websites.
  return [
    { url: getCanonicalUrl(context, "/"), lastModified, changeFrequency: "daily", priority: 1 },
    { url: getCanonicalUrl(context, "/pricing"), lastModified, changeFrequency: "weekly", priority: 0.8 },
  ];
}
