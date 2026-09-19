/**
 * theme-10/nativeData.ts — view modeli theme-10 („Silver Atelier") shell delova.
 *
 * Header i Footer su isti na početnoj strani i na podstranicama, pa oba
 * graditelja (`buildThemeNative`, `buildThemeShellNative`) zovu ovu funkciju —
 * dve kopije bi značile da footer može tiho da se razlikuje između strana.
 */

import type { SalonProfileData } from "@/types";
import { mergeHeroSocial } from "@/helpers/heroSocial";

export interface Theme10ShellData {
  header: { salonName: string; logo?: string };
  footer: {
    salonName: string;
    logo?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    social: {
      instagram?: string;
      telegram?: string;
      facebook?: string;
      tiktok?: string;
      whatsapp?: string;
    };
  };
}

export function buildTheme10Shell(salon: SalonProfileData): Theme10ShellData {
  const social = mergeHeroSocial(
    salon.social,
    salon.landingStructure?.landing?.hero?.socialLinks,
  );
  const address = [salon.street, salon.city].filter(Boolean).join(", ");
  const logo = salon.logo ?? undefined;

  return {
    header: { salonName: salon.name, logo },
    footer: {
      salonName: salon.name,
      logo,
      tagline: salon.shortDescription || undefined,
      address: address || undefined,
      phone: salon.phone || undefined,
      email: salon.contactEmail || salon.email || undefined,
      social: {
        instagram: social.instagram || undefined,
        telegram: social.telegram || undefined,
        facebook: social.facebook || undefined,
        tiktok: social.tiktok || undefined,
        whatsapp: social.whatsapp || undefined,
      },
    },
  };
}
