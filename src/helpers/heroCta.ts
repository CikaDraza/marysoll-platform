/**
 * helpers/heroCta.ts — razrešavanje hero CTA linkova.
 *
 * Izdvojeno iz `ThemeLayout` (l. 156–169) da bi migrirana tema i zatečeni put
 * računali CTA na ISTOM mestu. Da su ostale dve kopije, prvi propušten default
 * ("/termini", "/usluge") bio bi tiha razlika između stare i nove putanje.
 *
 * Čista funkcija: prefiks tenant slug-a stiže kroz `resolveHref`.
 */

export interface HeroCtaSource {
  primary?: { text?: string; href?: string };
  secondary?: { text?: string; href?: string };
}

export interface ResolvedHeroCta {
  primary: { text: string; href: string };
  secondary?: { text: string; href: string };
}

const DEFAULT_PRIMARY_HREF = "/termini";
const DEFAULT_SECONDARY_HREF = "/usluge";

export function resolveHeroCtas(
  ctas: HeroCtaSource | undefined,
  resolveHref: (href: string) => string,
): ResolvedHeroCta {
  return {
    primary: {
      text: ctas?.primary?.text || "",
      href: resolveHref(ctas?.primary?.href || DEFAULT_PRIMARY_HREF),
    },
    secondary: ctas?.secondary
      ? {
          text: ctas.secondary.text || "",
          href: resolveHref(
            ctas.secondary.href || DEFAULT_SECONDARY_HREF,
          ),
        }
      : undefined,
  };
}
