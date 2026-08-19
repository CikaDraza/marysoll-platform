"use client";
/**
 * theme-3/blocks.tsx — renderer binding teme theme-3 (T2A, korak 5).
 *
 * theme-3 poštuje svih 8 svojih CMS flagova i nema nijednu bezuslovnu sekciju,
 * pa ovde nema compat putanje — sve ide kroz `<ThemeBlock>`.
 *
 * Booking i „zigzag" galerija koriste theme-1 komponente; tako je i danas.
 */

import { Theme1AppointmentSection, Theme1GallerySection } from "../theme-1";
import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import { theme1BookingProps } from "../theme-1/blockProps";
import {
  theme3AboutProps,
  theme3BlogProps,
  theme3FaqProps,
  theme3GalleryRender,
  theme3HeroProps,
  theme3ServicesCatalogProps,
} from "./blockProps";
import {
  BlogSection,
  Theme3AboutSoft,
  Theme3FAQSoft,
  Theme3GalleryMasonry,
  Theme3HeroSoft,
  Theme3ServicesSoft,
  Theme3TestimonialsSoft,
} from ".";

function HeroBlock({ data }: BlockRenderProps<"content.hero">) {
  const { resolveHref } = useThemeRouting();
  return <Theme3HeroSoft {...theme3HeroProps(data, resolveHref)} />;
}

function AboutBlock({ data }: BlockRenderProps<"content.about">) {
  return <Theme3AboutSoft {...theme3AboutProps(data)} />;
}

function ServicesCatalogBlock({ data }: BlockRenderProps<"services.catalog">) {
  const { tenantSlug } = useThemeRouting();
  return <Theme3ServicesSoft {...theme3ServicesCatalogProps(data, tenantSlug)} />;
}

/**
 * `Theme3TestimonialsSoft` ne prima podatke — prikaz je statičan. Blok i dalje
 * postoji jer odluku o vidljivosti donosi CMS; menja se samo ŠTA se renderuje.
 */
function TestimonialsBlock(_props: BlockRenderProps<"content.testimonials">) {
  return <Theme3TestimonialsSoft />;
}

function GalleryBlock({ data }: BlockRenderProps<"content.gallery">) {
  const render = theme3GalleryRender(data);
  return render.layout === "masonry" ? (
    <Theme3GalleryMasonry {...render.props} />
  ) : (
    <Theme1GallerySection {...render.props} />
  );
}

function BookingServicesBlock({ data }: BlockRenderProps<"booking.services">) {
  const { tenantSlug, clientSlug } = useThemeRouting();
  return (
    <Theme1AppointmentSection
      {...theme1BookingProps(data, tenantSlug, clientSlug)}
    />
  );
}

function FaqBlock({ data }: BlockRenderProps<"content.faq">) {
  return <Theme3FAQSoft {...theme3FaqProps(data)} />;
}

function BlogBlock({ data }: BlockRenderProps<"content.blog">) {
  const { tenantSlug } = useThemeRouting();
  return <BlogSection {...theme3BlogProps(data, tenantSlug)} />;
}

/** theme-3 nema renderer za `content.team` i `content.perks`. */
export const THEME3_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "content.about": AboutBlock,
  "services.catalog": ServicesCatalogBlock,
  "content.testimonials": TestimonialsBlock,
  "content.gallery": GalleryBlock,
  "booking.services": BookingServicesBlock,
  "content.faq": FaqBlock,
  "content.blog": BlogBlock,
};
