/**
 * theme-3/blockProps.ts — mapiranje podataka bloka u propove theme-3 komponenti.
 *
 * Isti obrazac kao theme-1/theme-2: čiste funkcije, da se migracija dokaže
 * poređenjem sa doslovnom kopijom starog JSX-a.
 *
 * Dve osobenosti theme-3 koje se prenose kakve jesu:
 *   - `Theme3TestimonialsSoft` ne prima nijedan prop (statičan prikaz), pa blok
 *     `content.testimonials` ovde nema šta da mapira — bitno je samo DA LI se
 *     renderuje;
 *   - galerija u „images-with-category" varijanti koristi theme-1 komponentu.
 */

import type { AboutTextLink, HeroImage, IService } from "@/types";
import { aboutStatsItems, type StatItem } from "../blocks/statsItems";
import { galleryRender, type GalleryRender } from "../blocks/galleryRender";
import type {
  ContentAboutData,
  ContentBlogData,
  ContentFaqData,
  ContentGalleryData,
  ContentHeroData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import { resolveHeroCtas, type ResolvedHeroCta } from "@/helpers/heroCta";

export interface Theme3HeroProps {
  headline?: string;
  subheadline?: string;
  imageMain?: HeroImage;
  imageGrid?: HeroImage[];
  cta: ResolvedHeroCta;
}

export function theme3HeroProps(
  data: ContentHeroData,
  resolveHref: (href: string) => string,
): Theme3HeroProps {
  return {
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    imageMain: data.content?.image,
    imageGrid: data.content?.images,
    cta: resolveHeroCtas(data.content?.ctas, resolveHref),
  };
}

export interface Theme3AboutProps {
  about: {
    headline?: string;
    paragraphs: string[];
    links: AboutTextLink[];
    image?: HeroImage;
    stats?: StatItem[];
  };
}

export function theme3AboutProps(data: ContentAboutData): Theme3AboutProps {
  return {
    about: {
      headline: data.content?.headline,
      paragraphs: data.content?.paragraphs ?? [],
      links: data.content?.links ?? [],
      image: data.content?.image,
      stats: aboutStatsItems(data.stats, data.content?.yearsOfExperience),
    },
  };
}

export interface Theme3ServicesCatalogProps {
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
}

export function theme3ServicesCatalogProps(
  data: ServicesCatalogData,
  tenantSlug?: string,
): Theme3ServicesCatalogProps {
  return {
    services: data.services,
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    tenantSlug,
  };
}


export interface Theme3FaqProps {
  items?: { question: string; answer: string }[];
  headline?: string;
}

export function theme3FaqProps(data: ContentFaqData): Theme3FaqProps {
  return {
    items: data.content?.items,
    headline: data.content?.headline,
  };
}

export interface Theme3BlogProps {
  headline?: string;
  paragraph?: string;
  tenantSlug?: string;
  authorName?: string;
  authorImage?: string;
}

export function theme3BlogProps(
  data: ContentBlogData,
  tenantSlug?: string,
): Theme3BlogProps {
  return {
    headline: data.content?.headline,
    paragraph: data.content?.paragraph,
    tenantSlug,
    authorName: data.author.name,
    authorImage: data.author.image,
  };
}

export function theme3GalleryRender(
  data: ContentGalleryData,
): GalleryRender {
  return galleryRender(data);
}
