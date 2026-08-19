/**
 * theme-1/blockProps.ts — mapiranje podataka bloka u propove theme-1 komponenti.
 *
 * Izdvojeno iz `blocks.tsx` da bi migracija bila DOKAZIVA: ovo su čiste
 * funkcije, pa `blockProps.test.ts` može da ih uporedi sa doslovnom kopijom
 * starog JSX-a iz `Theme1Landing` nad stvarnim tenant podacima. Zamenjen ili
 * izostavljen prop je najveći rizik ovog commit-a i jedino se ovako hvata bez
 * renderovanja.
 *
 * Funkcije ne znaju za React i ne čitaju ništa van podataka svog bloka.
 */

import { galleryRender, type GalleryRender } from "../blocks/galleryRender";
import type { IService, SalonProfileData } from "@/types";
import type {
  BookingServicesData,
  ContentAboutData,
  ContentFaqData,
  ContentGalleryData,
  ContentHeroData,
  ContentTestimonialsData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type { AboutTextLink } from "@/types";
import { resolveHeroCtas, type ResolvedHeroCta } from "@/helpers/heroCta";

export interface Theme1HeroProps {
  salon: SalonProfileData;
  heroData: {
    headline: string;
    subheadline?: string;
    whereWhatForWhom?: string;
  };
  cta: ResolvedHeroCta;
}

export function theme1HeroProps(
  data: ContentHeroData,
  resolveHref: (href: string) => string,
): Theme1HeroProps {
  return {
    salon: data.salon,
    heroData: {
      headline: data.content?.headline ?? "",
      subheadline: data.content?.subheadline,
      whereWhatForWhom: data.content?.whereWhatForWhom,
    },
    cta: resolveHeroCtas(data.content?.ctas, resolveHref),
  };
}

export interface Theme1AboutProps {
  about: {
    headline?: string;
    paragraphs: string[];
    links: AboutTextLink[];
    image: { src: string; alt: string };
  };
}

export function theme1AboutProps(data: ContentAboutData): Theme1AboutProps {
  return {
    about: {
      headline: data.content?.headline,
      paragraphs: data.content?.paragraphs ?? [],
      links: data.content?.links ?? [],
      image: {
        src: data.content?.image?.src ?? "",
        alt: data.content?.image?.alt ?? "",
      },
    },
  };
}

export interface Theme1ServicesCatalogProps {
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
}

/** `null` = zatečeno ponašanje: bez usluga se sekcija ne prikazuje. */
export function theme1ServicesCatalogProps(
  data: ServicesCatalogData,
  tenantSlug?: string,
): Theme1ServicesCatalogProps | null {
  if (data.services.length === 0) return null;
  return {
    services: data.services,
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    tenantSlug,
  };
}

export interface Theme1BookingProps {
  tenantSlug?: string;
  clientSlug?: string;
  salon: SalonProfileData;
  services: IService[];
  headline?: string;
  subheadline?: string;
  instructions?: { name: string; icon: string }[];
}

export function theme1BookingProps(
  data: BookingServicesData,
  tenantSlug?: string,
  clientSlug?: string,
): Theme1BookingProps {
  return {
    tenantSlug,
    clientSlug: clientSlug ?? tenantSlug,
    salon: data.salon,
    services: data.services,
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    instructions: data.content?.instructions,
  };
}

export interface Theme1TestimonialsProps {
  testimonials?: PublicTestimonial[];
  headline?: string;
}

export function theme1TestimonialsProps(
  data: ContentTestimonialsData,
): Theme1TestimonialsProps {
  return {
    testimonials: data.testimonials.length > 0 ? data.testimonials : undefined,
    headline: data.content?.headline,
  };
}


export interface Theme1FaqProps {
  headline?: string;
  subheadline?: string;
  items?: { question: string; answer: string }[];
  supportText?: string;
  supportEmail?: string;
}

export function theme1FaqProps(data: ContentFaqData): Theme1FaqProps {
  return {
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    items: data.content?.items,
    supportText: data.content?.support?.text,
    supportEmail: data.content?.support?.email,
  };
}

export function theme1GalleryRender(
  data: ContentGalleryData,
): GalleryRender {
  return galleryRender(data);
}
