import { LandingStructure, SalonProfileData } from "@/types";

/**
 * Ulaz na nivou SEKCIJE — koriste ga Feature Block renderi, koji dobijaju samo
 * svoj deo CMS-a, ne ceo `LandingStructure`. `mapHero` je tanak omotač nad ovim,
 * pa zatečeni pozivaoci ostaju nepromenjeni.
 */
export function mapHeroSection(
  section: LandingStructure["landing"]["hero"] | undefined,
  profile: SalonProfileData,
  tenantSlug?: string,
) {
  const p = tenantSlug ? `/${tenantSlug}` : "";
  const hero = section ?? ({} as Partial<LandingStructure["landing"]["hero"]>);

  return {
    headline: hero.headline ?? profile.name,

    subheadline: hero.subheadline ?? "",

    imageMain: hero.image ? { src: hero.image.src ?? "", alt: hero.image.alt } : undefined,

    cta: {
      text: hero.ctas?.primary?.text ?? "Book now",
      href: hero.ctas?.primary?.href ?? "termini",
    },

    contact: {
      phone: hero.contact?.phone || profile.phone,
      location: hero.contact?.location || `${profile.city}, ${profile.street}`,
    },
  };
}

export function mapHero(
  ls: LandingStructure | undefined,
  profile: SalonProfileData,
  tenantSlug?: string,
) {
  return mapHeroSection(ls?.landing?.hero, profile, tenantSlug);
}
