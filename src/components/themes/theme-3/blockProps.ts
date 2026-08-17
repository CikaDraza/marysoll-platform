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

type GalleryTreatments = NonNullable<ContentGalleryData["content"]>["treatments"];

export type Theme3GalleryRender =
  | { layout: "masonry"; props: { images?: HeroImage[]; headline?: string } }
  | {
      layout: "zigzag";
      props: {
        instagramUrl: string;
        instagramTag: string;
        headline?: string;
        subheadline?: string;
        treatments?: GalleryTreatments;
      };
    };

export function theme3GalleryRender(
  data: ContentGalleryData,
): Theme3GalleryRender {
  const { content, galleryVariant, instagramFallback } = data;

  if (galleryVariant === "images-only") {
    return {
      layout: "masonry",
      props: { images: content?.images, headline: content?.headline },
    };
  }

  return {
    layout: "zigzag",
    props: {
      instagramUrl: content?.instagram?.link || instagramFallback,
      instagramTag: content?.instagram?.username || instagramFallback,
      headline: content?.headline,
      subheadline: content?.subheadline,
      treatments:
        content?.treatments && content.treatments.length > 0
          ? content.treatments
          : undefined,
    },
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
