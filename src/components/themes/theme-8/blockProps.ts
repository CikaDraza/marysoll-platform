/**
 * theme-8/blockProps.ts — mapiranje podataka bloka u propove theme-8 komponenti.
 *
 * theme-8 je custom tema za The Lash Room i ima najviše CMS-specifičnih polja
 * (Y2K wordmark, marquee, photo captions, perks CTA-ovi). Sve se prenosi kakvo
 * jeste — fallback tekstovi i slike ostaju u komponentama.
 *
 * BOOKING NIJE OVDE. theme-8 nema inline booking sekciju; booking postoji kroz
 * modal (`Theme8ModalProvider`, shell sloj) i `/termini`. Vidi spec 6.10 —
 * `appointmentSection.enabled` znači „želim vidljivu sekciju na početnoj", ne
 * „booking postoji".
 */

import type { AboutTextLink, HeroImage, IService } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import type {
  ContentAboutData,
  ContentFaqData,
  ContentGalleryData,
  ContentHeroData,
  ContentPerksData,
  ContentTestimonialsData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import { resolveHeroCtas, type ResolvedHeroCta } from "@/helpers/heroCta";

export interface Theme8HeroProps {
  heroData: {
    headline?: string;
    subheadline?: string;
    image?: HeroImage;
    images?: HeroImage[];
  };
  cta: ResolvedHeroCta;
  salonName?: string;
  salonCity?: string;
  eyebrow?: string;
  wordmark?: { prefix?: string; line1?: string; line2?: string; tail?: string };
  marquee?: string[];
  photoCaptions?: { primary?: string; founder?: string };
  tenantStats?: TenantStats;
  yearsOfExperience?: number;
  openingYear?: number;
}

export function theme8HeroProps(
  data: ContentHeroData,
  resolveHref: (href: string) => string,
): Theme8HeroProps {
  const c = data.content;
  return {
    heroData: {
      headline: c?.headline,
      subheadline: c?.subheadline,
      image: c?.image,
      images: c?.images,
    },
    cta: resolveHeroCtas(c?.ctas, resolveHref),
    salonName: data.salon.name,
    salonCity: data.salon.city,
    eyebrow: c?.theme8?.eyebrow,
    wordmark: c?.theme8?.wordmark,
    marquee: c?.theme8?.marquee,
    photoCaptions: c?.theme8?.photoCaptions,
    tenantStats: data.stats,
    yearsOfExperience: data.experience.yearsOfExperience,
    openingYear: data.experience.openingYear,
  };
}

export interface Theme8AboutProps {
  about: {
    headline?: string;
    paragraphs: string[];
    links: AboutTextLink[];
    image?: { src: string; alt: string };
    images?: HeroImage[];
  };
  founderName?: string;
}

export function theme8AboutProps(data: ContentAboutData): Theme8AboutProps {
  const image = data.content?.image?.src
    ? { src: data.content.image.src, alt: data.content.image.alt ?? "" }
    : undefined;
  return {
    about: {
      headline: data.content?.headline,
      paragraphs: data.content?.paragraphs ?? [],
      links: data.content?.links ?? [],
      image,
      images: data.content?.images,
    },
    founderName: data.salonName,
  };
}

export interface Theme8ServicesCatalogProps {
  services: IService[];
  tenantSlug?: string;
  headline?: string;
  subheadline?: string;
}

/** `null` = zatečeno ponašanje: bez usluga se sekcija ne prikazuje. */
export function theme8ServicesCatalogProps(
  data: ServicesCatalogData,
  tenantSlug?: string,
): Theme8ServicesCatalogProps | null {
  if (data.services.length === 0) return null;
  return {
    services: data.services,
    tenantSlug,
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
  };
}

type GalleryTreatments = NonNullable<ContentGalleryData["content"]>["treatments"];

export interface Theme8GalleryProps {
  treatments?: GalleryTreatments;
  headline?: string;
  tenantSlug?: string;
}

export function theme8GalleryProps(
  data: ContentGalleryData,
  tenantSlug?: string,
): Theme8GalleryProps {
  return {
    treatments: data.content?.treatments,
    headline: data.content?.headline,
    tenantSlug,
  };
}

export interface Theme8PerksProps {
  perks: {
    pill?: string;
    eyebrow?: string;
    headline?: string;
    paragraphs: string[];
    images?: HeroImage[];
    ctas: {
      primary: { text: string; href: string };
      secondary: { text: string; href: string };
    };
  };
}

/**
 * Prazan href se NAMERNO ne resolve-uje: `resolveHref("")` vraća "#", pa bi
 * komponenta prikazala dugme koje ne vodi nigde. Prazan string je signal
 * „nema dugmeta".
 */
export function theme8PerksProps(
  data: ContentPerksData,
  resolveHref: (href: string) => string,
): Theme8PerksProps {
  const c = data.content;
  return {
    perks: {
      pill: c?.pill,
      eyebrow: c?.eyebrow,
      headline: c?.headline,
      paragraphs: c?.paragraphs ?? [],
      images: c?.images,
      ctas: {
        primary: {
          text: c?.ctas?.primary?.text ?? "",
          href: c?.ctas?.primary?.href ? resolveHref(c.ctas.primary.href) : "",
        },
        secondary: {
          text: c?.ctas?.secondary?.text ?? "",
          href: c?.ctas?.secondary?.href
            ? resolveHref(c.ctas.secondary.href)
            : "",
        },
      },
    },
  };
}

export interface Theme8TestimonialsProps {
  testimonials?: PublicTestimonial[];
  tenantSlug?: string;
  initialHasMore?: boolean;
  headline?: string;
}

export function theme8TestimonialsProps(
  data: ContentTestimonialsData,
  opts: { tenantSlug?: string; showFixtures?: boolean },
): Theme8TestimonialsProps {
  const reviewCount = data.stats?.reviewCount ?? 0;
  return {
    testimonials: data.testimonials,
    tenantSlug: opts.tenantSlug,
    initialHasMore:
      reviewCount > data.testimonials.length ||
      (Boolean(opts.showFixtures) && data.testimonials.length === 0),
    headline: data.content?.headline,
  };
}

export interface Theme8FaqProps {
  items?: { question: string; answer: string }[];
  headline?: string;
  supportText?: string;
}

export function theme8FaqProps(data: ContentFaqData): Theme8FaqProps {
  return {
    items: data.content?.items,
    headline: data.content?.headline,
    supportText: data.content?.support?.text,
  };
}
