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
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TenantProvider } from "@/contexts/TenantContext";
import { CookiesModal } from "@/components/client/CookiesModal";
import { TenantThemeController } from "@/components/themes/TenantThemeController";
import { TenantSiteBeacon } from "@/components/shared/TenantSiteBeacon";
import { AddToHomeScreenBanner } from "@/components/shared/AddToHomeScreenBanner";
import {
  fetchPublicSalonProfile,
  fetchTenantPublicStatus,
} from "@/lib/tenant/fetchTenantData";
import { usableRasterLogo } from "@/lib/branding/rasterLogo";
import { tenantAppName } from "@/lib/pwa/tenantAppName";
import { getPublicSiteContext } from "@/lib/seo/public-site";
import { TenantJsonLd } from "@/components/seo/TenantJsonLd";

const PLATFORM_PWA_ICON = "/marysoll_elegant_logo.png";

/**
 * PWA/Apple ikona je zaseban raster `notificationLogo`: logo sajta može biti
 * SVG, što Android/iOS instalacija i web-push ne podržavaju pouzdano. Fallback
 * je uvek Marysoll, nikad tenantov site logo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const base = h.get("x-tenant-base-path") ?? "";
  if (!tenantSlug) return {};
  const profile = await fetchPublicSalonProfile(tenantSlug);
  const appName = tenantAppName(profile?.name);
  const icon = usableRasterLogo(profile?.notificationLogo)
    ? profile.notificationLogo
    : PLATFORM_PWA_ICON;

  return {
    applicationName: appName,
    appleWebApp: {
      capable: true,
      title: appName,
      statusBarStyle: "default",
    },
    // Na host-based tenant domenu je /manifest.json; u localhost/preview
    // path-based režimu mora ostati ispod /{slug} da proxy zna tenanta.
    manifest: `${base}/manifest.json`,
    icons: { icon, apple: icon },
  };
}

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const tenantId = h.get("x-tenant-id") ?? "";
  const base = h.get("x-tenant-base-path") ?? "";
  const context = getPublicSiteContext({
    domainType: h.get("x-domain-type") ?? "",
    tenantSlug,
    tenantCustomDomain: h.get("x-tenant-custom-domain") ?? "",
    publicHost: h.get("x-public-host") ?? "",
  });
  const pathname = h.get("x-public-pathname") ?? "/";

  if (!tenantSlug) {
    notFound();
  }

  // Javni sajt je vidljiv tek kada superadmin aktivira salon. Do tada salon
  // POTPUNO radi u panelu (profil, usluge, termini) — čeka se samo javna
  // vidljivost. Auth strane su izuzete da vlasnica može da se prijavi sa svog
  // subdomena.
  const status = await fetchTenantPublicStatus(tenantSlug);
  const isAuthPath = /^\/(login|register|forgot-password|reset-password|verify-email|resend-verification)(\/|$)/.test(
    pathname,
  );
  if (status && status !== "active" && !isAuthPath) {
    return <TenantSitePending />;
  }

  // Resolve the salon's landing theme so tenant auth pages can render the
  // matching themed form (e.g. the Y2K forms for "theme-8"). 5-min cached.
  const profile = await fetchPublicSalonProfile(tenantSlug);
  const appName = tenantAppName(profile?.name);
  const landingTheme = profile?.landingTheme;
  const clientGender = profile?.clientGender;

  return (
    <TenantProvider
      tenantSlug={tenantSlug}
      tenantId={tenantId}
      base={base}
      landingTheme={landingTheme}
      clientGender={clientGender}
    >
      <TenantThemeController />
      {profile && context.kind === "TENANT" && (
        <TenantJsonLd profile={profile} context={context} pathname={pathname} />
      )}
      <TenantSiteBeacon />
      <AddToHomeScreenBanner audience="tenant" appName={appName} />
      {children}
      <CookiesModal basePath={base} />
    </TenantProvider>
  );
}

/** Javna strana salona koji još nije aktiviran. Bez pominjanja infrastrukture. */
function TenantSitePending() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 dark:bg-gray-950">
      <div className="max-w-md text-center">
        <p className="text-4xl">✨</p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-50">
          Sajt se priprema
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Salon uskoro objavljuje svoju stranicu. Hvala na strpljenju.
        </p>
      </div>
    </main>
  );
}
