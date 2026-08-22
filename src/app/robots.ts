import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getCanonicalUrl, getPublicSiteContext } from "@/lib/seo/public-site";
import { buildRobotsRules } from "@/lib/seo/robotsRules";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const context = getPublicSiteContext({
    domainType: h.get("x-domain-type") ?? "marketing",
    tenantSlug: h.get("x-tenant-slug") ?? "",
    tenantCustomDomain: h.get("x-tenant-custom-domain") ?? "",
    publicHost: h.get("x-public-host") ?? "",
  });
  return {
    rules: buildRobotsRules(),
    // Preview/staging namerno OSTAJE crawlable: zaštita je `noindex` meta tag
    // iz tenantPageMetadata. Da smo ovde stavili Disallow, crawler ne bi ni
    // pročitao taj tag, pa bi linkovan preview URL mogao da završi u indeksu
    // bez sadržaja. Izostavlja se samo sitemap, da se preview ne reklamira.
    sitemap: context.isPreview ? undefined : getCanonicalUrl(context, "/sitemap.xml"),
  };
}
