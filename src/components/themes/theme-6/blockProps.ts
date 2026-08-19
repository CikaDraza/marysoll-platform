/**
 * theme-6/blockProps.ts — mapiranje podataka bloka u propove theme-6 komponenti.
 *
 * theme-6 komponente imaju bogate podrazumevane vrednosti (demo tekstovi), pa je
 * bitno da se `undefined` prosledi kao `undefined` — tek tada komponenta pokaže
 * svoj default. Zato se ovde ništa ne „popravlja" praznim stringom.
 *
 * Galerija ima poseban oblik: theme-6 ne koristi zajedničko izvođenje jer njen
 * portfolio prikaz traži `{ src, title }`, a ne `{ src, alt }`.
 */

import type { AboutTextLink, IService } from "@/types";
import { aboutStatsItems, type StatItem } from "../blocks/statsItems";
import type {
  ContentAboutData,
  ContentGalleryData,
  ContentHeroData,
  ContentTeamData,
  ContentTestimonialsData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import { resolveHeroCtas } from "@/helpers/heroCta";

export interface Theme6HeroProps {
  salonName: string;
  salonDescription: string;
  headline?: string;
  subheadline?: string;
  imageUrl?: string;
  cta: { label: string; href: string };
}

export function theme6HeroProps(
  data: ContentHeroData,
  resolveHref: (href: string) => string,
): Theme6HeroProps {
  // Isti helper kao u ThemeLayout-u — vrednost je identična `resolvedCta`.
  const cta = resolveHeroCtas(data.content?.ctas, resolveHref);
  return {
    salonName: data.salon.name,
    salonDescription: data.salon.description,
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    imageUrl: data.content?.image?.src,
    cta: {
      label: cta.primary.text || "Zakaži",
      href: cta.primary.href,
    },
  };
}

export interface Theme6AboutProps {
  headline?: string;
  paragraphs?: string[];
  links: AboutTextLink[];
  stats?: StatItem[];
}

export function theme6AboutProps(data: ContentAboutData): Theme6AboutProps {
  return {
    headline: data.content?.headline,
    // Namerno: samo pravi niz ide dalje, inače komponenta pokazuje svoj default.
    paragraphs: Array.isArray(data.content?.paragraphs)
      ? data.content.paragraphs
      : undefined,
    links: data.content?.links ?? [],
    stats: aboutStatsItems(data.stats, data.content?.yearsOfExperience),
  };
}

export interface Theme6ServicesCatalogProps {
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
}

/** `null` = zatečeno ponašanje: bez usluga se sekcija ne prikazuje. */
export function theme6ServicesCatalogProps(
  data: ServicesCatalogData,
  tenantSlug?: string,
): Theme6ServicesCatalogProps | null {
  if (data.services.length === 0) return null;
  return {
    services: data.services,
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    tenantSlug,
  };
}

export interface Theme6TestimonialsProps {
  testimonials: { name: string; text: string }[];
}

/** `null` kad nema utisaka — theme-6 tada ne prikazuje sekciju. */
export function theme6TestimonialsProps(
  data: ContentTestimonialsData,
): Theme6TestimonialsProps | null {
  if (data.testimonials.length === 0) return null;
  return {
    testimonials: data.testimonials.map((t) => ({
      name: t.clientName,
      text: t.comment,
    })),
  };
}

export interface Theme6TeamProps {
  headline?: string;
  members?: { name: string; role: string; image?: string }[];
}

export function theme6TeamProps(data: ContentTeamData): Theme6TeamProps {
  return {
    headline: data.content?.headline,
    members: data.content?.members?.map((m) => ({
      name: m.name,
      role: m.role,
      image: m.image?.src,
    })),
  };
}

export interface Theme6GalleryProps {
  headline?: string;
  subheadline?: string;
  images: { src: string; title?: string }[];
}

/** `null` kad nema slika — sekcija se tada ne prikazuje. */
export function theme6GalleryProps(
  data: ContentGalleryData,
): Theme6GalleryProps | null {
  const images = (data.content?.images ?? []).map((img) => ({
    src: img.src,
    title: img.alt,
  }));
  if (images.length === 0) return null;
  return {
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    images,
  };
}
