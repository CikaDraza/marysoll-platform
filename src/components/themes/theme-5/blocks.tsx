"use client";
/**
 * theme-5/blocks.tsx — renderer binding teme theme-5 (T2A, korak 5).
 *
 * theme-5 je stres-test compat sloja: PET CMS sekcija renderuje bezuslovno
 * (hero, servicesPreview, appointmentSection, about, gallery), a poštuje samo
 * `artistsEnabled` i `testimonialsEnabled`. Sve to se vidi u `Theme5Landing`;
 * ovde su samo rendereri, isti za obe putanje.
 */

import type { ComponentProps } from "react";
import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import {
  theme5AboutData,
  theme5ArtistsData,
  theme5BookingProps,
  theme5GalleryData,
  theme5HeroData,
  theme5ServicesData,
  theme5TestimonialsData,
} from "./blockProps";
import {
  Theme5About,
  Theme5AppointmentSection,
  Theme5Artists,
  Theme5Gallery,
  Theme5Hero,
  Theme5Services,
  Theme5Testimonials,
} from ".";

function HeroBlock({ data }: BlockRenderProps<"content.hero">) {
  const { tenantSlug } = useThemeRouting();
  return (
    <Theme5Hero data={theme5HeroData(data, tenantSlug)} tenantSlug={tenantSlug} />
  );
}

function ServicesCatalogBlock({ data }: BlockRenderProps<"services.catalog">) {
  const { tenantSlug } = useThemeRouting();
  const ui = theme5ServicesData(data);
  return <Theme5Services data={ui} services={ui.services} tenantSlug={tenantSlug} />;
}

function BookingServicesBlock({ data }: BlockRenderProps<"booking.services">) {
  const { tenantSlug, clientSlug } = useThemeRouting();
  return (
    <Theme5AppointmentSection
      {...theme5BookingProps(data, tenantSlug, clientSlug)}
    />
  );
}

function TeamBlock({ data }: BlockRenderProps<"content.team">) {
  const { tenantSlug } = useThemeRouting();
  return (
    <Theme5Artists data={theme5ArtistsData(data)} tenantSlug={tenantSlug} />
  );
}

function AboutBlock({ data }: BlockRenderProps<"content.about">) {
  const { tenantSlug } = useThemeRouting();
  return (
    <Theme5About
      data={
        theme5AboutData(data) as ComponentProps<typeof Theme5About>["data"]
      }
      tenantSlug={tenantSlug}
    />
  );
}

function TestimonialsBlock({ data }: BlockRenderProps<"content.testimonials">) {
  const { tenantSlug } = useThemeRouting();
  return (
    <Theme5Testimonials
      data={theme5TestimonialsData(data)}
      tenantSlug={tenantSlug}
    />
  );
}

function GalleryBlock({ data }: BlockRenderProps<"content.gallery">) {
  const { tenantSlug } = useThemeRouting();
  return (
    <Theme5Gallery data={theme5GalleryData(data)} tenantSlug={tenantSlug} />
  );
}

/** theme-5 nema renderer za faq, blog i perks. */
export const THEME5_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "services.catalog": ServicesCatalogBlock,
  "booking.services": BookingServicesBlock,
  "content.team": TeamBlock,
  "content.about": AboutBlock,
  "content.testimonials": TestimonialsBlock,
  "content.gallery": GalleryBlock,
};
