"use client";
/**
 * theme-6/blocks.tsx — renderer binding teme theme-6 (T2A, korak 5).
 *
 * theme-6 poštuje svih 6 svojih CMS flagova i nema bezuslovnih sekcija.
 * Tri sekcije imaju prazno stanje (bez usluga / utisaka / slika ne prikazuju se)
 * — to je zatečeno ponašanje i prenosi se kroz `null` iz mapiranja propova.
 */

import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import {
  theme6AboutProps,
  theme6GalleryProps,
  theme6HeroProps,
  theme6ServicesCatalogProps,
  theme6TeamProps,
  theme6TestimonialsProps,
} from "./blockProps";
import {
  Theme6AboutEditorial,
  Theme6Hero,
  Theme6PortfolioGallery,
  Theme6ServicesGrid,
  Theme6TeamSection,
  Theme6Testimonials,
} from ".";

function HeroBlock({ data }: BlockRenderProps<"content.hero">) {
  const { resolveHref } = useThemeRouting();
  return <Theme6Hero {...theme6HeroProps(data, resolveHref)} />;
}

function AboutBlock({ data }: BlockRenderProps<"content.about">) {
  return <Theme6AboutEditorial {...theme6AboutProps(data)} />;
}

function ServicesCatalogBlock({ data }: BlockRenderProps<"services.catalog">) {
  const { tenantSlug } = useThemeRouting();
  const props = theme6ServicesCatalogProps(data, tenantSlug);
  if (!props) return null;
  return <Theme6ServicesGrid {...props} />;
}

function TestimonialsBlock({ data }: BlockRenderProps<"content.testimonials">) {
  const props = theme6TestimonialsProps(data);
  if (!props) return null;
  return <Theme6Testimonials {...props} />;
}

function TeamBlock({ data }: BlockRenderProps<"content.team">) {
  return <Theme6TeamSection {...theme6TeamProps(data)} />;
}

function GalleryBlock({ data }: BlockRenderProps<"content.gallery">) {
  const props = theme6GalleryProps(data);
  if (!props) return null;
  return <Theme6PortfolioGallery {...props} />;
}

/** theme-6 nema renderer za booking, faq, blog i perks. */
export const THEME6_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "content.about": AboutBlock,
  "services.catalog": ServicesCatalogBlock,
  "content.testimonials": TestimonialsBlock,
  "content.team": TeamBlock,
  "content.gallery": GalleryBlock,
};
