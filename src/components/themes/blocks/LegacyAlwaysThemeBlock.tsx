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

import { createElement } from "react";
import type { FeatureBlockType } from "@/lib/platform/blocks/types";
import { lookupLegacyAlwaysBlock } from "./selection";
import { rendererFor } from "./renderers";
import { reportSkip, useThemeBlockScope } from "./ThemeBlockScope";

export interface LegacyAlwaysThemeBlockProps<
  K extends FeatureBlockType = FeatureBlockType,
> {
  /** Tema koja sekciju renderuje bezuslovno — mora biti tema scope-a. */
  theme: string;
  /** CMS sekcija iz inventara, npr. "appointmentSection". */
  source: string;
  type: K;
}

export function LegacyAlwaysThemeBlock<K extends FeatureBlockType>({
  theme,
  source,
  type,
}: LegacyAlwaysThemeBlockProps<K>) {
  const scope = useThemeBlockScope();
  if (!scope) return null;

  const lookup = lookupLegacyAlwaysBlock({
    theme,
    scopeTheme: scope.theme,
    source,
    type,
    data: scope.data,
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

  // Isti poziv renderera kao u `ThemeBlock` — compat putanja ne sme da menja
  // ni props ni identitet komponente, samo način na koji je blok pronađen.
  const { resolved } = lookup;
  return createElement(Renderer, {
    data: resolved.data as never,
    config: resolved.config as never,
    blockId: resolved.id,
    theme: scope.theme,
  });
}
