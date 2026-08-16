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

import type { ThemeDocument } from "@panta/theme-engine";
import type { FeatureBlockType } from "@/lib/platform/blocks/types";
import { renderBlockLookup } from "./renderLookup";
import { lookupThemeBlock } from "./selection";
import { useThemeBlockScope } from "./ThemeBlockScope";

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

  return renderBlockLookup(
    scope,
    lookupThemeBlock({
      document,
      type,
      data: scope.data,
      theme: scope.theme,
    }),
    type,
  );
}
