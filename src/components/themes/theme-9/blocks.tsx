"use client";
/**
 * theme-9/blocks.tsx — renderer binding teme theme-9.
 *
 * Mapa je NA NIVOU MODULA (renderers.ts:12) — nova mapa pri svakom renderu bi
 * značila remount bloka.
 *
 * theme-9 namerno NEMA renderer za `services.catalog` ni `booking.services`:
 * Marinin proizvod je Consultation, zaseban domen (`booking.consultations`),
 * i stiže u svom slice-u. Blok bez renderera se preskače uz telemetriju.
 */
import type { BlockRenderProps, ThemeBlockRenderers } from "../blocks/renderers";
import { useThemeRouting } from "../blocks/ThemeBlockScope";
import { theme9AboutProps, theme9HeroProps } from "./blockProps";
import { Theme9About } from "./AboutSection";
import { Theme9Hero } from "./Hero";

function HeroBlock({ data }: BlockRenderProps<"content.hero">) {
  const { resolveHref } = useThemeRouting();
  return <Theme9Hero {...theme9HeroProps(data, resolveHref)} />;
}

function AboutBlock({ data }: BlockRenderProps<"content.about">) {
  return <Theme9About {...theme9AboutProps(data)} />;
}

export const THEME9_BLOCK_RENDERERS: ThemeBlockRenderers = {
  "content.hero": HeroBlock,
  "content.about": AboutBlock,
};
