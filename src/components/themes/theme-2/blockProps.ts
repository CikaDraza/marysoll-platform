/**
 * theme-2/blockProps.ts — mapiranje podataka bloka u propove theme-2 komponenti.
 *
 * Isti obrazac kao kod theme-1: čiste funkcije, da se migracija dokaže
 * poređenjem sa doslovnom kopijom starog JSX-a nad stvarnim tenantom.
 *
 * Dve stvari koje su specifične za theme-2 i NAMERNO se prenose kakve jesu:
 *   - about slika je hard-kodovana u temi (nije CMS podatak);
 *   - services i testimonials sekcije nemaju guard za prazan spisak, pa se
 *     renderuju i prazne. To je zatečeno ponašanje, ne popravlja se u T2A.
 */

import type { AboutTextLink, IService } from "@/types";
import type { PublicTestimonial } from "@/types/public-testimonials";
import { aboutStatsItems, type StatItem } from "../blocks/statsItems";
import { galleryRender, type GalleryRender } from "../blocks/galleryRender";
import type {
  ContentAboutData,
  ContentGalleryData,
  ContentHeroData,
  ContentTestimonialsData,
  ServicesCatalogData,
  TestimonialsVariant,
} from "@/lib/platform/blocks/types";
import { resolveHeroCtas, type ResolvedHeroCta } from "@/helpers/heroCta";

export interface Theme2HeroProps {
  salonName: string;
  salonDescription: string;
  salonPhone: string;
  salonCity: string;
  salonStreet: string;
  headline?: string;
  subheadline?: string;
  imageUrl?: string;
  cta: ResolvedHeroCta;
}

export function theme2HeroProps(
  data: ContentHeroData,
  resolveHref: (href: string) => string,
): Theme2HeroProps {
  return {
    salonName: data.salon.name,
    salonDescription: data.salon.description,
    salonPhone: data.salon.phone,
    salonCity: data.salon.city,
    salonStreet: data.salon.street,
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    imageUrl: data.content?.image?.src,
    cta: resolveHeroCtas(data.content?.ctas, resolveHref),
  };
}

/** Slika about sekcije je theme-2 dizajn konstanta, ne CMS podatak. */
export const THEME2_ABOUT_IMAGE_URL =
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1776463003/Gemini_Generated_Image_dvp99xdvp99xdvp9_uaamaf.png";

export interface Theme2AboutProps {
  title: string;
  text: string[] | string;
  links: AboutTextLink[];
  imageUrl: string;
  stats?: StatItem[];
}

export function theme2AboutProps(data: ContentAboutData): Theme2AboutProps {
  return {
    title: data.content?.headline || "O nama",
    text: data.content?.paragraphs || "Saznajte više o nama",
    links: data.content?.links ?? [],
    imageUrl: THEME2_ABOUT_IMAGE_URL,
    stats: aboutStatsItems(data.stats, data.content?.yearsOfExperience),
  };
}

export interface Theme2ServicesCatalogProps {
  showIcons: boolean;
  services: IService[];
  headline?: string;
  subheadline?: string;
  tenantSlug?: string;
}

export function theme2ServicesCatalogProps(
  data: ServicesCatalogData,
  tenantSlug?: string,
): Theme2ServicesCatalogProps {
  return {
    showIcons: data.content?.showIcons ?? true,
    services: data.services,
    headline: data.content?.headline,
    subheadline: data.content?.subheadline,
    tenantSlug,
  };
}


export interface Theme2TestimonialsRender {
  variant: TestimonialsVariant;
  props: { testimonials: PublicTestimonial[]; headline: string };
}

/**
 * Jedan blok, dve varijante prikaza. `cards` je ono što tenant danas vidi
 * (headline="" → komponenta pada na svoj podrazumevani naslov).
 */
export function theme2TestimonialsRender(
  data: ContentTestimonialsData,
  variant: TestimonialsVariant | undefined,
): Theme2TestimonialsRender {
  return {
    variant: variant ?? "cards",
    props: { testimonials: data.testimonials, headline: "" },
  };
}

export type Theme2GalleryRender =
  | Extract<GalleryRender, { layout: "masonry" }>
  | {
      layout: "showcase";
      props: Extract<GalleryRender, { layout: "showcase" }>["props"] & {
        tenantSlug?: string;
      };
    };

export function theme2GalleryRender(
  data: ContentGalleryData,
  tenantSlug?: string,
): Theme2GalleryRender {
  const render = galleryRender(data);
  return render.layout === "masonry"
    ? render
    : { ...render, props: { ...render.props, tenantSlug } };
}
