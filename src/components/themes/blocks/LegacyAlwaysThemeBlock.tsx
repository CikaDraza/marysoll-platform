"use client";
/**
 * LegacyAlwaysThemeBlock — ⚠️ PRIVREMENA compatibility putanja, samo za T2A.
 *
 *   Composition Inventory allowlist → LegacyAlwaysThemeBlock → ISTI Registry
 *   → ISTI server loader → ISTI renderer
 *
 * Postoji jer tri teme danas renderuju neke CMS sekcije uprkos `enabled: false`
 * (inventar 6.1). T2A je extraction: proizvod mora izgledati isto pre i posle.
 * Poštovanje tih flagova je promena ponašanja i radi se posebno, u
 * T2A-FOLLOWUP „CMS Visibility Semantics Normalization", po tenantu.
 *
 * Razlika u odnosu na `<ThemeBlock>` je JEDNA: preskače se provera postojanja
 * bloka u `ThemeDocument`-u. Sve ostalo je identično — isti registry, isti
 * loader, isti renderer, isti props.
 *
 * Upotreba je dozvoljena samo za par (tema, sekcija) koji Composition Inventory
 * označava kao `conditional: "always…"`. Svaki drugi poziv se ne renderuje i
 * prijavljuje se telemetriji; `selection.test.ts` ga odbija u CI-ju.
 *
 * BRISANJE: kada tenant matrica bude rešena, poziv se menja u
 * `<ThemeBlock document={document} type="…" />` — bez ijedne izmene engine-a,
 * registry-ja ili loadera.
 */

import type { ReactNode } from "react";
import type { FeatureBlockType } from "@/lib/platform/blocks/types";
import { renderBlockLookup } from "./renderLookup";
import { lookupLegacyAlwaysBlock } from "./selection";
import { useThemeBlockScope } from "./ThemeBlockScope";

export interface LegacyAlwaysThemeBlockProps<
  K extends FeatureBlockType = FeatureBlockType,
> {
  /** Tema koja sekciju renderuje bezuslovno — mora biti tema scope-a. */
  theme: string;
  /** CMS sekcija iz inventara, npr. "appointmentSection". */
  source: string;
  type: K;
  slots?: Record<string, ReactNode>;
}

export function LegacyAlwaysThemeBlock<K extends FeatureBlockType>({
  theme,
  source,
  type,
  slots,
}: LegacyAlwaysThemeBlockProps<K>) {
  const scope = useThemeBlockScope();
  if (!scope) return null;

  // Isti `renderBlockLookup` kao u `ThemeBlock` — compat putanja menja samo
  // NAČIN pronalaženja bloka, nikad njegovo renderovanje.
  return renderBlockLookup(
    scope,
    lookupLegacyAlwaysBlock({
      theme,
      scopeTheme: scope.theme,
      source,
      type,
      data: scope.data,
    }),
    type,
    slots,
  );
}
