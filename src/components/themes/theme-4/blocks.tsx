"use client";
/**
 * theme-4/blocks.tsx — renderer binding teme theme-4 (T2A, korak 5).
 *
 * theme-4 poštuje svih 6 svojih CMS flagova i nema bezuslovnih sekcija — nema
 * compat putanje. Booking ima svoju komponentu; „zigzag" galerija koristi
 * theme-1 komponentu, kao i danas.
 */

import { Theme1GallerySection } from "../theme-1";
import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import { theme1BookingProps } from "../theme-1/blockProps";
import {
  theme4AboutProps,
  theme4FaqProps,
  theme4GalleryRender,
  theme4HeroProps,
  theme4ServicesCatalogProps,
} from "./blockProps";
import {
  Theme4AboutSoft,
  Theme4AppointmentSection,
  Theme4FAQSection,
  Theme4GalleryMasonry,
  Theme4HeroSoft,
  Theme4ServicesSoft,
} from ".";

function HeroBlock({ data }: BlockRenderProps<"content.hero">) {
  const { resolveHref } = useThemeRouting();
  return <Theme4HeroSoft {...theme4HeroProps(data, resolveHref)} />;
}

function AboutBlock({ data }: BlockRenderProps<"content.about">) {
  return <Theme4AboutSoft {...theme4AboutProps(data)} />;
}

function ServicesCatalogBlock({ data }: BlockRenderProps<"services.catalog">) {
  const { tenantSlug } = useThemeRouting();
  return <Theme4ServicesSoft {...theme4ServicesCatalogProps(data, tenantSlug)} />;
}

function BookingServicesBlock({ data }: BlockRenderProps<"booking.services">) {
  const { tenantSlug, clientSlug } = useThemeRouting();
  return (
    <Theme4AppointmentSection
      {...theme1BookingProps(data, tenantSlug, clientSlug)}
    />
  );
}

function GalleryBlock({ data }: BlockRenderProps<"content.gallery">) {
  const render = theme4GalleryRender(data);
  return render.layout === "masonry" ? (
    <Theme4GalleryMasonry {...render.props} />
  ) : (
    <Theme1GallerySection {...render.props} />
  );
}

function FaqBlock({ data }: BlockRenderProps<"content.faq">) {
  return <Theme4FAQSection {...theme4FaqProps(data)} />;
}

/** theme-4 nema renderer za `content.team`, `content.testimonials`, blog i perks. */
export const THEME4_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "content.about": AboutBlock,
  "services.catalog": ServicesCatalogBlock,
  "booking.services": BookingServicesBlock,
  "content.gallery": GalleryBlock,
  "content.faq": FaqBlock,
};
