"use client";
/**
 * theme-2/blocks.tsx — renderer binding teme theme-2 (T2A, korak 5).
 *
 * Ovde se prvi put vidi model varijanti: `content.testimonials` je JEDAN blok
 * sa dva moguća prikaza (`cards` / `highlights`), a ne dve sekcije iste
 * semantike. Koja je aktivna bira `config.presentationVariant`.
 *
 * Booking koristi theme-1 komponentu — tako je i danas; theme-2 nema svoju.
 */

import { Theme1AppointmentSection } from "../theme-1";
import { Theme3GalleryMasonry } from "../theme-3";
import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import { theme1BookingProps } from "../theme-1/blockProps";
import {
  theme2AboutProps,
  theme2GalleryRender,
  theme2HeroProps,
  theme2ServicesCatalogProps,
  theme2TestimonialsRender,
} from "./blockProps";
import {
  Theme2AboutSplit,
  Theme2GalleryGrid,
  Theme2Hero,
  Theme2ServicesPreview,
  Theme2Testimonials,
  Theme2TestimonialsSection,
} from ".";

function HeroBlock({ data }: BlockRenderProps<"content.hero">) {
  const { resolveHref } = useThemeRouting();
  return <Theme2Hero {...theme2HeroProps(data, resolveHref)} />;
}

function AboutBlock({ data }: BlockRenderProps<"content.about">) {
  return <Theme2AboutSplit {...theme2AboutProps(data)} />;
}

function ServicesCatalogBlock({ data }: BlockRenderProps<"services.catalog">) {
  const { tenantSlug } = useThemeRouting();
  // theme-2 nema guard za prazan spisak usluga — zatečeno ponašanje.
  return <Theme2ServicesPreview {...theme2ServicesCatalogProps(data, tenantSlug)} />;
}

function BookingServicesBlock({ data }: BlockRenderProps<"booking.services">) {
  const { tenantSlug, clientSlug } = useThemeRouting();
  return (
    <Theme1AppointmentSection
      {...theme1BookingProps(data, tenantSlug, clientSlug)}
    />
  );
}

function GalleryBlock({ data }: BlockRenderProps<"content.gallery">) {
  const { tenantSlug } = useThemeRouting();
  const render = theme2GalleryRender(data, tenantSlug);
  return render.layout === "masonry" ? (
    <Theme3GalleryMasonry {...render.props} />
  ) : (
    <Theme2GalleryGrid {...render.props} />
  );
}

function TestimonialsBlock({
  data,
  config,
}: BlockRenderProps<"content.testimonials">) {
  const render = theme2TestimonialsRender(data, config.presentationVariant);
  return render.variant === "highlights" ? (
    <Theme2TestimonialsSection testimonials={render.props.testimonials} />
  ) : (
    <Theme2Testimonials {...render.props} />
  );
}

/**
 * theme-2 nema renderer za `content.team`, `content.faq`, `content.blog` i
 * `content.perks` — te sekcije tema ni danas ne prikazuje.
 */
export const THEME2_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "content.about": AboutBlock,
  "services.catalog": ServicesCatalogBlock,
  "booking.services": BookingServicesBlock,
  "content.gallery": GalleryBlock,
  "content.testimonials": TestimonialsBlock,
};
