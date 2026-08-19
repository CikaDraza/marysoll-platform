"use client";
/**
 * theme-8/blocks.tsx — renderer binding teme theme-8 (T2A, korak 5).
 *
 * theme-8 poštuje svih 7 svojih CMS flagova i nema bezuslovnih sekcija.
 * Booking se ovde NE pojavljuje kao blok: tema nema inline booking sekciju, a
 * modal je shell sloj (`Theme8ModalProvider`) — jedna od tri površine istog
 * booking proizvoda (spec 6.10).
 */

import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import { useTheme8Fixtures } from "./fixturesContext";
import {
  theme8AboutProps,
  theme8FaqProps,
  theme8GalleryProps,
  theme8HeroProps,
  theme8PerksProps,
  theme8ServicesCatalogProps,
  theme8TestimonialsProps,
} from "./blockProps";
import {
  Theme8AboutUs,
  Theme8FAQSection,
  Theme8GallerySection,
  Theme8Hero,
  Theme8Perks,
  Theme8Services,
  Theme8TestimonialsSection,
} from ".";

function HeroBlock({ data }: BlockRenderProps<"content.hero">) {
  const { resolveHref } = useThemeRouting();
  return <Theme8Hero {...theme8HeroProps(data, resolveHref)} />;
}

function AboutBlock({ data }: BlockRenderProps<"content.about">) {
  return <Theme8AboutUs {...theme8AboutProps(data)} />;
}

function ServicesCatalogBlock({ data }: BlockRenderProps<"services.catalog">) {
  const { tenantSlug } = useThemeRouting();
  const props = theme8ServicesCatalogProps(data, tenantSlug);
  if (!props) return null;
  return <Theme8Services {...props} />;
}

function GalleryBlock({ data }: BlockRenderProps<"content.gallery">) {
  const { tenantSlug } = useThemeRouting();
  return <Theme8GallerySection {...theme8GalleryProps(data, tenantSlug)} />;
}

function PerksBlock({ data }: BlockRenderProps<"content.perks">) {
  const { resolveHref } = useThemeRouting();
  return <Theme8Perks {...theme8PerksProps(data, resolveHref)} />;
}

function TestimonialsBlock({ data }: BlockRenderProps<"content.testimonials">) {
  const { tenantSlug, clientSlug } = useThemeRouting();
  const showFixtures = useTheme8Fixtures();
  return (
    <Theme8TestimonialsSection
      {...theme8TestimonialsProps(data, {
        tenantSlug: clientSlug ?? tenantSlug,
        showFixtures,
      })}
    />
  );
}

function FaqBlock({ data }: BlockRenderProps<"content.faq">) {
  return <Theme8FAQSection {...theme8FaqProps(data)} />;
}

/** theme-8 nema renderer za `content.team`, `booking.services` i blog. */
export const THEME8_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "content.about": AboutBlock,
  "services.catalog": ServicesCatalogBlock,
  "content.gallery": GalleryBlock,
  "content.perks": PerksBlock,
  "content.testimonials": TestimonialsBlock,
  "content.faq": FaqBlock,
};
