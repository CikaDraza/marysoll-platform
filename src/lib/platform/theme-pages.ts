/**
 * lib/platform/theme-pages.ts — razrešavanje tematskih podstranica.
 *
 * Jedno mesto koje odlučuje da li `/za-klijente` i `/za-profesionalce` postoje
 * za dati tenant. Izdvojeno iz same strane da bi odluka bila testabilna i da bi
 * jedno pravilo važilo za obe rute.
 *
 * NEMA FALLBACK SADRŽAJA. Ako tenant nema `themePages`, strana je 404 — nikad
 * tuđi tekst. Seed skripta puni podatke jednog tenanta; tema ne sme da postane
 * njihov implicitni vlasnik.
 */
import type { SalonProfileData, ThemePageKey, TenantThemePage } from "@/types";

/** Teme koje uopšte imaju tematske podstranice. */
export const THEMES_WITH_PAGES = ["theme-9"] as const;

export function themeHasPages(landingTheme: string | undefined): boolean {
  return THEMES_WITH_PAGES.includes(
    (landingTheme ?? "") as (typeof THEMES_WITH_PAGES)[number],
  );
}

/**
 * Sadržaj strane, ili `null` kada je strana nedostupna:
 *   - profil nije nađen,
 *   - tema nema podstranice,
 *   - tenant nema sadržaj za taj ključ,
 *   - sadržaj postoji ali je isključen.
 */
export function resolveThemePage(
  profile: SalonProfileData | null | undefined,
  key: ThemePageKey,
): TenantThemePage | null {
  if (!profile) return null;
  if (!themeHasPages(profile.landingTheme)) return null;

  const page = profile.themePages?.[key];
  if (!page?.enabled) return null;

  return page;
}
