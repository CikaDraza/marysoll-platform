import { SalonProfileData } from "@/types";

export function mapHeader(profile: SalonProfileData, tenantSlug?: string) {
  const p = tenantSlug ? `/${tenantSlug}` : "";

  return {
    logo: profile.logo || profile.name,

    navigation: [
      { label: "Naslovna", href: `${p}/` },
      { label: "Usluge", href: `${p}/usluge` },
      { label: "Termini", href: `${p}/termini` },
      { label: "Login", href: `${p}/login` },
    ],

    cta: {
      label: "Zakazi sada",
      href: `${p}/termini`,
    },

    social: {
      instagram: profile.social?.instagram,
      facebook: profile.social?.facebook,
      tiktok: profile.social?.tiktok,
    },
  };
}
