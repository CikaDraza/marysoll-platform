/**
 * app/tenant/layout.tsx — Internal tenant route layout.
 *
 * This route is NEVER accessed directly by browsers.
 * The proxy (proxy.ts) rewrites tenant requests to this prefix:
 *   - subdomain:     kiki-kiss.marysoll.com/login  → /tenant/login
 *   - custom domain: kikikiss.rs/login             → /tenant/login
 *   - dev path:      localhost:3006/kiki-kiss/login → /tenant/login
 *
 * Reads x-tenant-slug, x-tenant-id, x-tenant-base-path from proxy-injected
 * headers and provides them to all child pages via TenantProvider.
 */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TenantProvider } from "@/contexts/TenantContext";
import { CookiesModal } from "@/components/client/CookiesModal";
import { TenantThemeController } from "@/components/themes/TenantThemeController";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const tenantId = h.get("x-tenant-id") ?? "";
  const base = h.get("x-tenant-base-path") ?? "";

  if (!tenantSlug) {
    notFound();
  }

  // Resolve the salon's landing theme so tenant auth pages can render the
  // matching themed form (e.g. the Y2K forms for "theme-8"). 5-min cached.
  const profile = await fetchPublicSalonProfile(tenantSlug);
  const landingTheme = profile?.landingTheme;

  return (
    <TenantProvider
      tenantSlug={tenantSlug}
      tenantId={tenantId}
      base={base}
      landingTheme={landingTheme}
    >
      <TenantThemeController />
      {children}
      <CookiesModal tenantSlug={tenantSlug} />
    </TenantProvider>
  );
}
