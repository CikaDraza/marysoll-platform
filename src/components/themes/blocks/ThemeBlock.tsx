"use client";
/**
 * ThemeBlock — normalan put renderovanja CMS bloka.
 *
 *   ThemeDocument presence → ThemeBlock → Registry → server loader → renderer
 *
 * Tema kaže samo „ovde ide `services.catalog`". Ne zna za `servicesPreviewEnabled`,
 * ne zna za `IService`, ne zna odakle podaci. Vidljivost je jedno pitanje:
 * postoji li blok tog tipa u dokumentu.
 */

import { createElement } from "react";
import type { ThemeDocument } from "@panta/theme-engine";
import type { FeatureBlockType } from "@/lib/platform/blocks/types";
import { lookupThemeBlock } from "./selection";
import { rendererFor } from "./renderers";
import { reportSkip, useThemeBlockScope } from "./ThemeBlockScope";

export interface ThemeBlockProps<K extends FeatureBlockType = FeatureBlockType> {
  document: ThemeDocument;
  type: K;
}

export function ThemeBlock<K extends FeatureBlockType>({
  document,
  type,
}: ThemeBlockProps<K>) {
  const scope = useThemeBlockScope();
  if (!scope) return null;

  const lookup = lookupThemeBlock({
    document,
    type,
    data: scope.data,
    theme: scope.theme,
  });

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
