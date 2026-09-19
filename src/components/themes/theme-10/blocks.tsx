"use client";
/**
 * theme-10/blocks.tsx — renderer binding teme theme-10 („Silver Atelier").
 *
 * Mapa je na nivou modula (renderers.ts: nova mapa po renderu = remount).
 * theme-10 nema renderer za `booking.services` (booking je modal-launcher),
 * utiske, FAQ, blog ni perks.
 */

import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import {
  theme10GalleryProps,
  theme10HeroProps,
  theme10PriceListProps,
  theme10StyleProps,
  theme10TeamProps,
} from "./blockProps";
import { Theme10Gallery } from "./Gallery";
import { Theme10Hero } from "./Hero";
import { Theme10PriceList } from "./PriceList";
import { Theme10StyleTriptych } from "./StyleTriptych";
import { Theme10Team } from "./Team";

function HeroBlock({ data }: BlockRenderProps<"content.hero">) {
  const { resolveHref } = useThemeRouting();
  return <Theme10Hero {...theme10HeroProps(data, resolveHref)} />;
}

function AboutBlock({ data, slots }: BlockRenderProps<"content.about">) {
  return <Theme10StyleTriptych {...theme10StyleProps(data)} action={slots?.action} />;
}

function GalleryBlock({ data }: BlockRenderProps<"content.gallery">) {
  const { resolveHref } = useThemeRouting();
  return <Theme10Gallery {...theme10GalleryProps(data, resolveHref("/termini"))} />;
}

function ServicesCatalogBlock({ data }: BlockRenderProps<"services.catalog">) {
  const props = theme10PriceListProps(data);
  if (!props) return null;
  return <Theme10PriceList {...props} />;
}

function TeamBlock({ data }: BlockRenderProps<"content.team">) {
  const { resolveHref } = useThemeRouting();
  return <Theme10Team {...theme10TeamProps(data, resolveHref("/termini"))} />;
}

export const THEME10_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "content.about": AboutBlock,
  "content.gallery": GalleryBlock,
  "services.catalog": ServicesCatalogBlock,
  "content.team": TeamBlock,
};
