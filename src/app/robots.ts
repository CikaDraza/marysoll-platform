import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getCanonicalUrl, getPublicSiteContext } from "@/lib/seo/public-site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const context = getPublicSiteContext({
    domainType: h.get("x-domain-type") ?? "marketing",
    tenantSlug: h.get("x-tenant-slug") ?? "",
    tenantCustomDomain: h.get("x-tenant-custom-domain") ?? "",
    publicHost: h.get("x-public-host") ?? "",
  });
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/superadmin/",
        "/admin/",
        "/dashboard/",
        "/api/",
        "/login/",
        "/register/",
        "/auth/",
        "/forgot-password/",
        "/reset-password/",
        "/verify-email/",
        "/resend-verification/",
      ],
    },
    sitemap: context.isPreview ? undefined : getCanonicalUrl(context, "/sitemap.xml"),
  };
}
