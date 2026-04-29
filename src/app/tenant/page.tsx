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

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const profile = await fetchPublicSalonProfile(tenantSlug);

  const title =
    (profile?.seo as Record<string, string>)?.homeTitle ||
    profile?.name ||
    "Salon";
  const description =
    (profile?.seo as Record<string, string>)?.homeDescription ||
    profile?.description ||
    "";
  const logoUrl = profile?.logo ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: logoUrl ? [{ url: logoUrl }] : [],
      type: "website",
    },
    icons: logoUrl
      ? { icon: logoUrl, apple: logoUrl }
      : undefined,
  };
}

export default async function TenantHomePage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";

  return <ClientHomePage tenantSlug={tenantSlug} />;
}
