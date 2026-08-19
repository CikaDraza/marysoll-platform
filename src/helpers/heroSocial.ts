/**
 * helpers/heroSocial.ts — spajanje CMS hero social linkova preko salon profila.
 *
 * CMS pobeđuje samo kad je vrednost neprazna. Izdvojeno iz `ThemeLayout`
 * (l. 77–87) da bi migrirana tema (kroz hero blok) i zatečeni put računali
 * isto — dve kopije bi značile da jedna strana može tiho da se razidje.
 */

import type { SocialLinks } from "@/types";

export interface HeroSocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
  telegram?: string;
}

export function mergeHeroSocial(
  social: SocialLinks | undefined,
  heroLinks: HeroSocialLinks | undefined,
): SocialLinks {
  return {
    ...social,
    ...(heroLinks?.instagram ? { instagram: heroLinks.instagram } : {}),
    ...(heroLinks?.facebook ? { facebook: heroLinks.facebook } : {}),
    ...(heroLinks?.tiktok ? { tiktok: heroLinks.tiktok } : {}),
    ...(heroLinks?.whatsapp ? { whatsapp: heroLinks.whatsapp } : {}),
    ...(heroLinks?.telegram ? { telegram: heroLinks.telegram } : {}),
  } as SocialLinks;
}
