/**
 * app/tenant/za-klijente — theme-9 tematska podstranica.
 *
 * Sadržaj dolazi iz `SalonProfile.themePages["za-klijente"]` — odvojeno od
 * `landingStructure`, jer landing struktura opisuje kompoziciju POČETNE strane,
 * a ovo je sadržaj strane (vidi `TenantThemePage` u types).
 *
 * Strana postoji samo za teme koje je imaju. Ostale vraćaju `notFound()` — ruta
 * je u `CLIENT_TENANT_PATHS` za sve tenante, pa bez ovog guarda bi salon na
 * theme-3 servirao praznu stranu umesto 404.
 */
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";
import { resolveThemePage } from "@/lib/platform/theme-pages";
import { TenantPageShell } from "@/components/themes/TenantPageShell";
import { Theme9ContentPage } from "@/components/themes/theme-9/pages/Theme9ContentPage";

export const dynamic = "force-dynamic";

const PAGE_KEY = "za-klijente" as const;

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const profile = await fetchPublicSalonProfile(h.get("x-tenant-slug") ?? "");
  const page = profile?.themePages?.[PAGE_KEY];
  const salonName = profile?.name ?? "Salon";

  const title = page?.hero?.headline
    ? `${page.hero.headline} — ${salonName}`
    : `Za klijente` + ` — ${salonName}`;

  return {
    title,
    description: page?.hero?.lead ?? undefined,
    openGraph: { title, description: page?.hero?.lead ?? undefined, type: "website" },
  };
}

export default async function Page() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const profile = await fetchPublicSalonProfile(tenantSlug);

  // Jedno pravilo za obe rute; bez fallback sadržaja (vidi `theme-pages.ts`).
  const page = resolveThemePage(profile, PAGE_KEY);
  if (!page) notFound();

  return (
    <TenantPageShell tenantSlug={tenantSlug}>
      <Theme9ContentPage page={page} heroTone="meadow" />
    </TenantPageShell>
  );
}
