/**
 * lib/theme9/navigationResolver.ts — 2C content-aware navigation resolver
 *
 * Čist modul: bez DB-a, bez React-a, bez I/O. Ulaz su činjenice o dostupnosti
 * odredišta, izlaz je lista stavki koje smeju da se prikažu.
 *
 * ZAŠTO POSTOJI
 * Do sada su o istoj stvari odlučivala DVA nezavisna mesta:
 *
 *     ruta  /za-klijente   →  `resolveThemePage()`  →  sadržaja nema  →  404
 *     nav   „Za klijente"  →  hardkodovan niz       →  uvek vidljivo  →  klik
 *
 * Tenant bez `themePages` je zato dobijao header koji vodi u 404. To nije
 * hipoteza: `themePages` puni seed jednog tenanta, a `resolveThemePage()` NEMA
 * fallback sadržaj — drugi theme-9 tenant nema nijednu od te dve strane.
 *
 * 2C ne menja rutu (404 je tamo tačan odgovor kad sadržaja nema) nego navodi
 * navigaciju da čita ISTO pravilo: `isThemePageAvailable()` iz `theme-pages.ts`.
 *
 * BLOG I EDUKACIJA SU DVA NEZAVISNA KANALA (odluka 2026-08-30)
 * Ugovor je u docs/PANTA-EDU-CENTAR-ARC.md („Blog i Edukacija") i
 * docs/MARYSOLL_EDUCATION_CENTER_AND_EDU_STUDIO.md („Navigation contract"):
 *
 *     /blogs      → NewsletterCampaign     marketing, novosti, SEO
 *     /edukacija  → EducationContent       stručna edukacija
 *
 *     blog ima objavljen sadržaj
 *             → Blog → /blogs
 *     education.catalog razrešen + ruta postoji + ima objavljen javan sadržaj
 *             → Edukacija → /edukacija
 *     oba      → obe stavke
 *     nijedan  → nijedna stavka
 *
 * PREVAZIĐENO: raniji fallback „Edukacija → /blogs" (dok `/edukacija` nije
 * postojala) više nije ugovor. Education Center NE zamenjuje Blog; tenant sme
 * imati jedan, drugi ili oba, i svaki link se razrešava nezavisno.
 */

/** Stavke koje theme-9 navigacija uopšte poznaje. */
export type Theme9NavKey =
  | "home"
  | "za-klijente"
  | "za-profesionalce"
  | "blog"
  | "education";

/** Ključevi tematskih podstranica — isti kao `ThemePageKey` u `@/types`. */
export type Theme9PageKey = Extract<
  Theme9NavKey,
  "za-klijente" | "za-profesionalce"
>;

export const THEME9_PAGE_KEYS = [
  "za-klijente",
  "za-profesionalce",
] as const satisfies readonly Theme9PageKey[];

export interface Theme9NavItem {
  key: Theme9NavKey;
  /** Već prefiksovan `base`-om; komponenta ga koristi kakav jeste. */
  href: string;
}

/**
 * Postoji li ruta `/edukacija` U KODU.
 *
 * Od UI-3A.1 postoji: `src/app/tenant/edukacija/{page,[...slug]}`. Ostaje kao
 * eksplicitna činjenica o kodu, ne kao želja — link ka nepostojećoj ruti je
 * tačno onaj 404 koji 2C uklanja.
 */
export const EDUCATION_ROUTE_AVAILABLE = true;

export interface Theme9EducationFacts {
  /** Ruta `/edukacija` postoji u kodu (`EDUCATION_ROUTE_AVAILABLE`). */
  routeAvailable: boolean;
  /** `education.catalog` razrešen kroz triple-gate za OVOG tenanta. */
  capabilityEnabled: boolean;
  /** Blog kanal: bar jedna objavljena `NewsletterCampaign` objava. */
  hasPublishedArticles: boolean;
  /** Education kanal: bar jedan objavljen JAVAN `EducationContent`. */
  hasPublishedEducation: boolean;
}

/**
 * Fail-closed polazište: bez ijedne prikupljene činjenice „Edukacija" se ne
 * prikazuje. Bolje stavka manje nego stavka koja vodi na praznu stranu.
 */
export const NO_EDUCATION_SURFACE: Theme9EducationFacts = {
  routeAvailable: EDUCATION_ROUTE_AVAILABLE,
  capabilityEnabled: false,
  hasPublishedArticles: false,
  hasPublishedEducation: false,
};

export interface Theme9NavFacts {
  /** Prefiks linkova: „" na subdomenu/custom domenu, „/{slug}" path-based. */
  base: string;
  /** Po strani: da li ona stvarno postoji za ovog tenanta. */
  pages: Record<Theme9PageKey, boolean>;
  education: Theme9EducationFacts;
}

/**
 * Odredište stavke „Blog", ili `null` kad ga nema.
 *
 * Blog ne zna ništa o Education capability-ju — to je poenta razdvajanja: salon
 * koji uključi Edu Centar ne sme izgubiti svoj blog.
 */
export function resolveBlogHref(
  education: Theme9EducationFacts,
  base: string,
): string | null {
  return education.hasPublishedArticles ? `${base}/blogs` : null;
}

/**
 * Odredište stavke „Edukacija", ili `null` kad ga nema.
 *
 * Sva tri uslova su obavezna i nezavisna od bloga: ruta u kodu, capability
 * tenanta i bar jedan objavljen javan sadržaj. Bez trećeg uslova stavka bi
 * vodila na praznu listu — isti onaj 404-po-osećaju koji 2C uklanja.
 * Fallback na `/blogs` ovde više NE postoji.
 */
export function resolveEducationHref(
  education: Theme9EducationFacts,
  base: string,
): string | null {
  return education.routeAvailable &&
    education.capabilityEnabled &&
    education.hasPublishedEducation
    ? `${base}/edukacija`
    : null;
}

/**
 * Cela navigacija teme, po istom pravilu za sve stavke: stavka postoji samo ako
 * njeno odredište ima sadržaj.
 *
 * „Početna" je jedini bezuslovni link — ona je sama tema i uvek se renderuje.
 */
export function resolveTheme9Nav(facts: Theme9NavFacts): Theme9NavItem[] {
  const items: Theme9NavItem[] = [{ key: "home", href: `${facts.base}/` }];

  for (const key of THEME9_PAGE_KEYS) {
    if (facts.pages[key]) items.push({ key, href: `${facts.base}/${key}` });
  }

  // Redosled u meniju: Blog pa Edukacija. Svaki se razrešava nezavisno, pa
  // tenant sme dobiti jedan, oba ili nijedan.
  const blog = resolveBlogHref(facts.education, facts.base);
  if (blog) items.push({ key: "blog", href: blog });

  const education = resolveEducationHref(facts.education, facts.base);
  if (education) items.push({ key: "education", href: education });

  return items;
}

/**
 * Nav bez ijedne prikupljene činjenice — samo „Početna".
 *
 * Za defanzivne grane u kojima view model teme nije stigao: bolje meni sa
 * jednom stavkom nego meni sa stavkama koje vode u 404.
 */
export function homeOnlyTheme9Nav(base: string): Theme9NavItem[] {
  return resolveTheme9Nav({
    base,
    pages: { "za-klijente": false, "za-profesionalce": false },
    education: NO_EDUCATION_SURFACE,
  });
}

/** Odgovarajuća stavka po ključu — za komponente koje prikazuju podskup nav-a. */
export function findNavItem(
  nav: readonly Theme9NavItem[],
  key: Theme9NavKey,
): Theme9NavItem | undefined {
  return nav.find((item) => item.key === key);
}
