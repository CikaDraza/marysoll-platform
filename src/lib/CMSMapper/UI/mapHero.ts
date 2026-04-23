import { LandingStructure, SalonProfileData } from "@/types";

export function mapHero(ls: LandingStructure | undefined, profile: SalonProfileData) {
  const hero = ls?.landing?.hero ?? ({} as Partial<LandingStructure["landing"]["hero"]>);

  return {
    headline: hero.headline ?? profile.name,

    subheadline: hero.subheadline ?? "",

    imageMain: hero.image ? { src: hero.image.src ?? "", alt: hero.image.alt } : undefined,

    cta: {
      text: hero.ctas?.primary?.text ?? "Book now",
      href: hero.ctas?.primary?.href ?? "/booking",
    },

    contact: {
      phone: hero.contact?.phone || profile.phone,
      location: hero.contact?.location || `${profile.city}, ${profile.street}`,
    },
  };
}
