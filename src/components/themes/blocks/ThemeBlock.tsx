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

import type { ReactNode } from "react";
import type { ThemeDocument } from "@panta/theme-engine";
import type { FeatureBlockType } from "@/lib/platform/blocks/types";
import { renderBlockLookup } from "./renderLookup";
import { lookupThemeBlock } from "./selection";
import { useThemeBlockScope } from "./ThemeBlockScope";

export interface ThemeBlockProps<K extends FeatureBlockType = FeatureBlockType> {
  document: ThemeDocument;
  type: K;
  /**
   * Blokovi koje kompozicija smešta UNUTAR ovog bloka (theme-7: booking u hero
   * slotu). Element se pravi ovde, ali se renderuje samo ako se renderuje i
   * roditeljski blok — pa isključen hero i dalje nosi svoj slot sa sobom.
   */
  slots?: Record<string, ReactNode>;
}

export function ThemeBlock<K extends FeatureBlockType>({
  document,
  type,
  slots,
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
    slots,
  );
}
