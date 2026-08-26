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
 * TRI ISHODA ZA „EDUKACIJU"
 * Ugovor je zaključan u docs/TODO.md §2C i
 * docs/MARYSOLL_EDUCATION_CENTER_AND_EDU_STUDIO.md („Navigation contract"):
 *
 *     Education Center dostupan + education.catalog razrešen + ruta spremna
 *             → /edukacija
 *     inače, tenant legitimno koristi postojeći blog sadržaj
 *             → /blogs
 *     inače
 *             → link se NE prikazuje
 *
 * Granica koju dokument izričito traži: `/blogs` se NE sme globalno zameniti sa
 * `/edukacija` dok ta ruta i capability stvarno ne postoje. Zato je
 * `EDUCATION_ROUTE_AVAILABLE` činjenica o kodu, a ne želja — vidi dole.
 */

/** Stavke koje theme-9 navigacija uopšte poznaje. */
export type Theme9NavKey =
  | "home"
  | "za-klijente"
  | "za-profesionalce"
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
 * Danas ne postoji — `src/app/tenant/` nema `edukacija/`. Dok je ovo `false`,
 * `/edukacija` se ne sme pojaviti ni u jednom linku, bez obzira na capability:
 * link ka nepostojećoj ruti je tačno onaj 404 koji 2C uklanja.
 *
 * Kada Education Center stigne (vidi
 * docs/MARYSOLL_EDUCATION_CENTER_AND_EDU_STUDIO.md, Faza 1), ovde se menja
 * `true` — i resolver, i test koji ga čuva, već znaju šta tada treba da se desi.
 */
export const EDUCATION_ROUTE_AVAILABLE = false;

export interface Theme9EducationFacts {
  /** Ruta `/edukacija` postoji u kodu (`EDUCATION_ROUTE_AVAILABLE`). */
  routeAvailable: boolean;
  /** `education.catalog` razrešen kroz triple-gate za OVOG tenanta. */
  capabilityEnabled: boolean;
  /** Tenant ima bar jednu objavljenu objavu na postojećem blog putu. */
  hasPublishedArticles: boolean;
}

/**
 * Fail-closed polazište: bez ijedne prikupljene činjenice „Edukacija" se ne
 * prikazuje. Bolje stavka manje nego stavka koja vodi na praznu stranu.
 */
export const NO_EDUCATION_SURFACE: Theme9EducationFacts = {
  routeAvailable: EDUCATION_ROUTE_AVAILABLE,
  capabilityEnabled: false,
  hasPublishedArticles: false,
};

export interface Theme9NavFacts {
  /** Prefiks linkova: „" na subdomenu/custom domenu, „/{slug}" path-based. */
  base: string;
  /** Po strani: da li ona stvarno postoji za ovog tenanta. */
  pages: Record<Theme9PageKey, boolean>;
  education: Theme9EducationFacts;
}

/**
 * Odredište stavke „Edukacija", ili `null` kad ga nema.
 *
 * Redosled je ugovor: Education Center ima prednost, ali TEK kada su ispunjena
 * oba uslova — ruta u kodu i capability tenanta. Nijedan sam nije dovoljan:
 * capability bez rute vodi u 404, ruta bez capability-ja vodi na tuđ proizvod.
 */
export function resolveEducationHref(
  education: Theme9EducationFacts,
  base: string,
): string | null {
  if (education.routeAvailable && education.capabilityEnabled) {
    return `${base}/edukacija`;
  }
  if (education.hasPublishedArticles) return `${base}/blogs`;
  return null;
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
