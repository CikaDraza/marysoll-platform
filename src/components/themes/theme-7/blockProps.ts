/**
 * theme-7/blockProps.ts — mapiranje podataka bloka u propove theme-7 komponenti.
 *
 * Osobenost theme-7: booking nije zasebna sekcija nego SLOT unutar hero-a. Zato
 * hero renderer ne zna ništa o bookingu — dobija ga kao `slots.booking`, gotov
 * element koji je kompozicija napravila. Vidi spec 6.10.
 *
 * Hero uz to prikazuje metrike i staž; oba stižu kroz podatke hero bloka, iz
 * istog deljenog izvora koji koristi i about blok (§3.5).
 */

import type { AboutTextLink, IService } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import type {
  BookingServicesData,
  ContentAboutData,
  ContentFaqData,
  ContentGalleryData,
  ContentHeroData,
  ContentTestimonialsData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import { resolveHeroCtas, type ResolvedHeroCta } from "@/helpers/heroCta";

export interface Theme7HeroProps {
  heroData: { headline?: string; subheadline?: string };
  cta: ResolvedHeroCta;
  tenantStats?: TenantStats;
  yearsOfExperience?: number;
  openingYear?: number;
}

export function theme7HeroProps(
  data: ContentHeroData,
  resolveHref: (href: string) => string,
): Theme7HeroProps {
  return {
    heroData: {
      headline: data.content?.headline,
      subheadline: data.content?.subheadline,
    },
    cta: resolveHeroCtas(data.content?.ctas, resolveHref),
    tenantStats: data.stats,
    yearsOfExperience: data.experience.yearsOfExperience,
    openingYear: data.experience.openingYear,
  };
}

export interface Theme7AboutProps {
  about: {
    headline?: string;
    paragraphs: string[];
    links: AboutTextLink[];
    image?: { src: string; alt: string };
  };
  founderName?: string;
}

export function theme7AboutProps(data: ContentAboutData): Theme7AboutProps {
  const image = data.content?.image?.src
    ? { src: data.content.image.src, alt: data.content.image.alt ?? "" }
    : undefined;
  return {
    about: {
      headline: data.content?.headline,
      paragraphs: data.content?.paragraphs ?? [],
      links: data.content?.links ?? [],
      image,
    },
    founderName: data.salonName,
  };
}

export interface Theme7ServicesCatalogProps {
  services: IService[];
  tenantSlug?: string;
  headline?: string;
  subheadline?: string;
}

/** `null` = zatečeno ponašanje: bez usluga se sekcija ne prikazuje. */
export function theme7ServicesCatalogProps(
  data: ServicesCatalogData,
  tenantSlug?: string,
): Theme7ServicesCatalogProps | null {
  if (data.services.length === 0) return null;
  return {
    services: data.services,
    tenantSlug,
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
  };
}

type GalleryTreatments = NonNullable<ContentGalleryData["content"]>["treatments"];

export interface Theme7GalleryProps {
  treatments?: GalleryTreatments;
  headline?: string;
  tenantSlug?: string;
}

/** theme-7 ne koristi deljeno izvođenje: prikazuje samo tretmane, bez varijanti. */
export function theme7GalleryProps(
  data: ContentGalleryData,
  tenantSlug?: string,
): Theme7GalleryProps {
  return {
    treatments: data.content?.treatments,
    headline: data.content?.headline,
    tenantSlug,
  };
}

export interface Theme7TestimonialsProps {
  testimonials?: PublicTestimonial[];
  headline?: string;
}

export function theme7TestimonialsProps(
  data: ContentTestimonialsData,
): Theme7TestimonialsProps {
  return {
    testimonials: data.testimonials.length > 0 ? data.testimonials : undefined,
    headline: data.content?.headline,
  };
}

export interface Theme7FaqProps {
  items?: { question: string; answer: string }[];
  headline?: string;
  supportText?: string;
}

export function theme7FaqProps(data: ContentFaqData): Theme7FaqProps {
  return {
    items: data.content?.items,
    headline: data.content?.headline,
    supportText: data.content?.support?.text,
  };
}

export interface Theme7BookingProps {
  tenantSlug?: string;
  clientSlug?: string;
  salon: BookingServicesData["salon"];
  services: IService[];
}

export function theme7BookingProps(
  data: BookingServicesData,
  tenantSlug?: string,
  clientSlug?: string,
): Theme7BookingProps {
  return {
    tenantSlug,
    clientSlug: clientSlug ?? tenantSlug,
    salon: data.salon,
    services: data.services,
  };
}
