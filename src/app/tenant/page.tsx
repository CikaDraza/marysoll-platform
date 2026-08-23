/**
 * app/tenant/page.tsx — Salon landing page.
 *
 * Served internally at /tenant when the proxy rewrites:
 *   - kiki-kiss.marysoll.com/     → /tenant
 *   - kikikiss.rs/                → /tenant
 *   - localhost:3006/kiki-kiss/   → /tenant  (dev)
 *
 * Tenant is resolved exclusively from x-tenant-slug header (proxy-injected).
 */
import { Metadata } from "next";
import { headers } from "next/headers";
import { ClientHomePage } from "@/components/client/ClientHomePage";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";
import { usableRasterLogo } from "@/lib/branding/rasterLogo";
import { getPublicSiteContext, tenantPageMetadata } from "@/lib/seo/public-site";
import {
  resolveTenantTitle,
  resolveTenantDescription,
  buildTenantMetadataFacts,
} from "@/lib/seo/metadataFallback";

const PLATFORM_PWA_ICON = "/marysoll_elegant_logo.png";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const profile = await fetchPublicSalonProfile(tenantSlug);

  const facts = buildTenantMetadataFacts(profile);
  // Ručno uneseni SEO uvek pobeđuje; fallback ide kroz CMS/profil pa činjenice.
  const title = resolveTenantTitle(
    (profile?.seo as Record<string, string>)?.homeTitle,
    facts,
  );
  const description = resolveTenantDescription(
    (profile?.seo as Record<string, string>)?.homeDescription,
    facts,
  );
  const installIcon = usableRasterLogo(profile?.notificationLogo)
    ? profile.notificationLogo
    : PLATFORM_PWA_ICON;

  return {
    ...tenantPageMetadata(
      profile,
      getPublicSiteContext({
        domainType: h.get("x-domain-type") ?? "",
        tenantSlug,
        tenantCustomDomain: h.get("x-tenant-custom-domain") ?? "",
        publicHost: h.get("x-public-host") ?? "",
      }),
      "/",
      title,
      description,
    ),
    // Instalirana aplikacija ne sme koristiti site logo: on može biti SVG.
    icons: { icon: installIcon, apple: installIcon },
  };
}

export default async function TenantHomePage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";

  return <ClientHomePage tenantSlug={tenantSlug} />;
}
