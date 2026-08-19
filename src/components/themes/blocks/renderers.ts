/**
 * components/themes/blocks/renderers.ts — kontrakt renderer bindinga.
 *
 * Tema prijavljuje mapu `tip bloka → njena komponenta`. Mapa je parcijalna
 * namerno: tema sme da nema renderer za blok (theme-8 npr. nema booking ni team
 * sekciju) — takav blok se preskače uz telemetriju, ne ruši stranu.
 *
 * Renderer dobija SAMO podatke svog bloka i njegov config. Ne dobija `salon`,
 * `services` ni `ls` — ako mu nešto od toga treba, to je podatak bloka i ide
 * kroz loader.
 *
 * ZAHTEV: mapa se definiše na nivou modula (`const THEME1_BLOCKS = {…}`), nikad
 * u telu komponente. Nova mapa pri svakom renderu = nov identitet komponente =
 * remount bloka (izgubljeno stanje, ponovljene animacije, skok LCP-a).
 */

import type { ComponentType, ReactNode } from "react";
import type {
  BlockConfigByType,
  BlockDataByType,
  FeatureBlockType,
} from "@/lib/platform/blocks/types";

export interface BlockRenderProps<K extends FeatureBlockType> {
  data: BlockDataByType[K];
  config: BlockConfigByType[K];
  blockId: string;
  theme: string;
  /**
   * Blokovi koje je KOMPOZICIJA smestila unutar ovog bloka (theme-7 drži
   * `booking.services` u hero slotu). Renderer ih samo ubacuje na svoje mesto —
   * ne zna šta su ni odakle im podaci, pa ovo NIJE pozajmljivanje tuđih podataka
   * nego slot, isti pojam koji `LayoutDefinition` već koristi.
   */
  slots?: Record<string, ReactNode>;
}

export type ThemeBlockRenderers = {
  [K in FeatureBlockType]?: ComponentType<BlockRenderProps<K>>;
};

/** Renderer za konkretan tip, ili `undefined` ako ga tema nema. */
export function rendererFor<K extends FeatureBlockType>(
  renderers: ThemeBlockRenderers,
  type: K,
): ComponentType<BlockRenderProps<K>> | undefined {
  return renderers[type];
}
