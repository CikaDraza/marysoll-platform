"use client";
/**
 * theme-1/blocks.tsx — renderer binding teme theme-1 (T2A, korak 5).
 *
 * Adapteri su namerno prazni: sve mapiranje je u `blockProps.ts` (čiste
 * funkcije, pokrivene testom protiv starog JSX-a). Ovde ostaje samo izbor
 * komponente i uzimanje rutiranja iz scope-a.
 *
 * Šta adapter NE sme: da čita podatke drugog bloka, niti da traži `salon`,
 * `services` ili `ls` mimo podataka svog bloka.
 *
 * Mapa je na nivou modula: nova mapa po renderu značila bi nov identitet
 * komponente i remount cele sekcije.
 */

import { Theme3GalleryMasonry } from "../theme-3";
import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import {
  theme1AboutProps,
  theme1BookingProps,
  theme1FaqProps,
  theme1GalleryRender,
  theme1HeroProps,
  theme1ServicesCatalogProps,
  theme1TestimonialsProps,
} from "./blockProps";
import {
  Theme1AboutUs,
  Theme1AppointmentSection,
  Theme1FAQSection,
  Theme1GallerySection,
  Theme1Hero,
  Theme1TestimonialsSection,
  Theme1WhatOffer,
} from ".";

function HeroBlock({ data }: BlockRenderProps<"content.hero">) {
  const { resolveHref } = useThemeRouting();
  return <Theme1Hero {...theme1HeroProps(data, resolveHref)} />;
}

function AboutBlock({ data }: BlockRenderProps<"content.about">) {
  return <Theme1AboutUs {...theme1AboutProps(data)} />;
}

function ServicesCatalogBlock({ data }: BlockRenderProps<"services.catalog">) {
  const { tenantSlug } = useThemeRouting();
  const props = theme1ServicesCatalogProps(data, tenantSlug);
  if (!props) return null;
  return <Theme1WhatOffer {...props} />;
}

function BookingServicesBlock({ data }: BlockRenderProps<"booking.services">) {
  const { tenantSlug, clientSlug } = useThemeRouting();
  return (
    <Theme1AppointmentSection
      {...theme1BookingProps(data, tenantSlug, clientSlug)}
    />
  );
}

function TestimonialsBlock({ data }: BlockRenderProps<"content.testimonials">) {
  return <Theme1TestimonialsSection {...theme1TestimonialsProps(data)} />;
}

function GalleryBlock({ data }: BlockRenderProps<"content.gallery">) {
  const render = theme1GalleryRender(data);
  return render.layout === "masonry" ? (
    <Theme3GalleryMasonry {...render.props} />
  ) : (
    <Theme1GallerySection {...render.props} />
  );
}

function FaqBlock({ data }: BlockRenderProps<"content.faq">) {
  return <Theme1FAQSection {...theme1FaqProps(data)} />;
}

/**
 * theme-1 nema renderer za `content.team`, `content.blog` i `content.perks` —
 * te sekcije tema ni danas ne prikazuje. Blok bez renderera se preskače uz
 * telemetriju, tako da izostanak ostaje vidljiv, a strana ne puca.
 */
export const THEME1_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "content.about": AboutBlock,
  "services.catalog": ServicesCatalogBlock,
  "booking.services": BookingServicesBlock,
  "content.testimonials": TestimonialsBlock,
  "content.gallery": GalleryBlock,
  "content.faq": FaqBlock,
};
