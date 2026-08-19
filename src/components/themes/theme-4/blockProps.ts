/**
 * theme-4/blockProps.ts — mapiranje podataka bloka u propove theme-4 komponenti.
 *
 * Osobenost theme-4: about statistika ima TRI nivoa fallback-a — izmerene
 * metrike, pa ručno upisane iz CMS-a (`landing.stats`), pa fiksne vrednosti
 * teme. Ostale teme sakriju sekciju statistike kad metrika nema; theme-4 uvek
 * nešto prikaže. Preneseno kakvo jeste.
 */

import type { AboutTextLink, HeroImage, IService } from "@/types";
import { aboutStatsItems, type StatItem } from "../blocks/statsItems";
import { galleryRender, type GalleryRender } from "../blocks/galleryRender";
import type {
  ContentAboutData,
  ContentFaqData,
  ContentGalleryData,
  ContentHeroData,
  ServicesCatalogData,
} from "@/lib/platform/blocks/types";
import { resolveHeroCtas } from "@/helpers/heroCta";

export interface Theme4HeroProps {
  headline?: string;
  subheadline?: string;
  imageMain?: HeroImage;
  cta: { text: string; href: string };
}

export function theme4HeroProps(
  data: ContentHeroData,
  resolveHref: (href: string) => string,
): Theme4HeroProps {
  return {
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    imageMain: data.content?.image,
    cta: resolveHeroCtas(data.content?.ctas, resolveHref).primary,
  };
}

/** Poslednji nivo: fiksne vrednosti teme kad nema ni metrika ni CMS unosa. */
export const THEME4_DEFAULT_STATS: StatItem[] = [
  { value: "500+", label: "Zadovoljnih klijenata" },
  { value: "800+", label: "Urađenih tretmana" },
];

export interface Theme4AboutProps {
  headline: string;
  paragraphs: string[];
  links: AboutTextLink[];
  stats: StatItem[];
  image?: HeroImage;
}

export function theme4AboutProps(data: ContentAboutData): Theme4AboutProps {
  return {
    headline: data.content?.headline || "O nama",
    paragraphs: data.content?.paragraphs || ["Saznajte više o nama"],
    links: data.content?.links ?? [],
    stats:
      aboutStatsItems(data.stats, data.content?.yearsOfExperience) ??
      data.authoredStats ??
      THEME4_DEFAULT_STATS,
    image: data.content?.image,
  };
}

export interface Theme4ServicesCatalogProps {
  showIcons: boolean;
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
  imageUrl?: string;
}

export function theme4ServicesCatalogProps(
  data: ServicesCatalogData,
  tenantSlug?: string,
): Theme4ServicesCatalogProps {
  return {
    showIcons: data.content?.showIcons ?? true,
    services: data.services,
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    tenantSlug,
    imageUrl: data.content?.image?.src,
  };
}


export interface Theme4FaqProps {
  headline?: string;
  subheadline?: string;
  items?: { question: string; answer: string }[];
  supportText?: string;
  supportEmail?: string;
}

export function theme4FaqProps(data: ContentFaqData): Theme4FaqProps {
  return {
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    items: data.content?.items,
    supportText: data.content?.support?.text,
    supportEmail: data.content?.support?.email,
  };
}

export function theme4GalleryRender(
  data: ContentGalleryData,
): GalleryRender {
  return galleryRender(data);
}
