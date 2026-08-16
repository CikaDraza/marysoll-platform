"use client";
/**
 * renderLookup — zajednički rep obe putanje renderovanja bloka.
 *
 * `ThemeBlock` i `LegacyAlwaysThemeBlock` razlikuju se SAMO po tome kako nađu
 * blok. Sve posle toga — telemetrija, traženje renderera, propovi — mora biti
 * identično, inače compat putanja tiho postaje drugačiji proizvod. Dok je to
 * bilo prepisano u obe komponente, ta garancija je zavisila od discipline;
 * ovako je strukturna.
 */

import { createElement, type ReactElement } from "react";
import type { FeatureBlockType } from "@/lib/platform/blocks/types";
import { rendererFor } from "./renderers";
import type { BlockLookup } from "./selection";
import { reportSkip, type ThemeBlockScopeValue } from "./ThemeBlockScope";

export function renderBlockLookup<K extends FeatureBlockType>(
  scope: ThemeBlockScopeValue,
  lookup: BlockLookup,
  type: K,
): ReactElement | null {
  if (lookup.status === "absent") return null;
  if (lookup.status === "skip") {
    reportSkip(scope, lookup.event);
    return null;
  }

  const Renderer = rendererFor(scope.renderers, type);
  if (!Renderer) {
    reportSkip(scope, {
      reason: "missing_renderer",
      type,
      blockId: lookup.resolved.id,
      theme: scope.theme,
    });
    return null;
  }

  // `createElement`, ne JSX: renderer se traži iz mape teme, ne pravi se u
  // renderu. Mapa mora biti definisana na nivou modula (vidi `renderers.ts`) —
  // inače bi svaki render menjao identitet komponente i remount-ovao blok.
  const { resolved } = lookup;
  return createElement(Renderer, {
    data: resolved.data as never,
    config: resolved.config as never,
    blockId: resolved.id,
    theme: scope.theme,
  });
}
