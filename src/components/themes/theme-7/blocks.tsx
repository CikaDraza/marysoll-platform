"use client";
/**
 * theme-7/blocks.tsx — renderer binding teme theme-7 (T2A, korak 5).
 *
 * Booking nije zasebna sekcija nego SLOT unutar hero-a (spec 6.10). Hero
 * renderer ga dobija gotovog kroz `slots.booking` i samo ga ubacuje na svoje
 * mesto — ne zna šta je unutra ni odakle mu podaci.
 */

import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import {
  theme7AboutProps,
  theme7BookingProps,
  theme7FaqProps,
  theme7GalleryProps,
  theme7HeroProps,
  theme7ServicesCatalogProps,
  theme7TestimonialsProps,
} from "./blockProps";
import {
  Theme7AboutUs,
  Theme7BookingCard,
  Theme7FAQSection,
  Theme7GallerySection,
  Theme7Hero,
  Theme7Services,
  Theme7TestimonialsSection,
} from ".";

function HeroBlock({ data, slots }: BlockRenderProps<"content.hero">) {
  const { resolveHref } = useThemeRouting();
  return (
    <Theme7Hero
      {...theme7HeroProps(data, resolveHref)}
      bookingSlot={slots?.booking}
    />
  );
}

function AboutBlock({ data }: BlockRenderProps<"content.about">) {
  return <Theme7AboutUs {...theme7AboutProps(data)} />;
}

function ServicesCatalogBlock({ data }: BlockRenderProps<"services.catalog">) {
  const { tenantSlug } = useThemeRouting();
  const props = theme7ServicesCatalogProps(data, tenantSlug);
  if (!props) return null;
  return <Theme7Services {...props} />;
}

function BookingServicesBlock({ data }: BlockRenderProps<"booking.services">) {
  const { tenantSlug, clientSlug } = useThemeRouting();
  return <Theme7BookingCard {...theme7BookingProps(data, tenantSlug, clientSlug)} />;
}

function GalleryBlock({ data }: BlockRenderProps<"content.gallery">) {
  const { tenantSlug } = useThemeRouting();
  return <Theme7GallerySection {...theme7GalleryProps(data, tenantSlug)} />;
}

function TestimonialsBlock({ data }: BlockRenderProps<"content.testimonials">) {
  return <Theme7TestimonialsSection {...theme7TestimonialsProps(data)} />;
}

function FaqBlock({ data }: BlockRenderProps<"content.faq">) {
  return <Theme7FAQSection {...theme7FaqProps(data)} />;
}

/** theme-7 nema renderer za `content.team`, blog i perks. */
export const THEME7_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "content.about": AboutBlock,
  "services.catalog": ServicesCatalogBlock,
  "booking.services": BookingServicesBlock,
  "content.gallery": GalleryBlock,
  "content.testimonials": TestimonialsBlock,
  "content.faq": FaqBlock,
};
