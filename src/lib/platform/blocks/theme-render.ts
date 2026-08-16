/**
 * lib/platform/blocks/theme-render.ts — server prolaz ZA JEDNU TEMU.
 *
 * Jedina razlika u odnosu na `resolveBlockData`: doda blokove za CMS sekcije
 * koje tema danas renderuje bezuslovno, iako ih dokument nema (`enabled:
 * false`). Bez toga bi bezuslovna sekcija u theme-2/5/7 ostala prazna — compat
 * mora da postoji i na putanji podataka, ne samo na putanji renderovanja.
 *
 * ⚠️ OVAJ FAJL JE PRIVREMEN, isto kao `legacy-always.ts` i
 * `LegacyAlwaysThemeBlock`. Kada T2A-FOLLOWUP normalizuje vidljivost, poziv se
 * menja u direktan `resolveBlockData(...)`, a fajl se briše — bez izmene
 * engine-a, registry-ja ili ijednog loadera.
 *
 * Teme bez bezuslovnih sekcija (theme-1/3/4/6/8) ovde ne plaćaju ništa: ne
 * dodaje se nijedan blok i ne traži se `landingStructure`.
 */

import type { ThemeDocument } from "@panta/theme-engine";
import { legacyAlwaysBlocks, legacyAlwaysSources } from "./legacy-always";
import { resolveBlockData, type ExtraBlock, type ResolveBlockDataOptions } from "./resolve";
import type { ResolvedBlockMap } from "./render-types";

/** Vrednost `ResolvedBlock.origin` za blok koji je stigao compat putanjom. */
export const LEGACY_ALWAYS_ORIGIN = "legacy-always";

export type ResolveThemeBlockDataOptions = Omit<
  ResolveBlockDataOptions,
  "extraBlocks"
> & { document: ThemeDocument };

export async function resolveThemeBlockData(
  options: ResolveThemeBlockDataOptions,
): Promise<ResolvedBlockMap> {
  const { document, theme, deps } = options;

  const extraBlocks: ExtraBlock[] =
    legacyAlwaysSources(theme).length === 0
      ? []
      : legacyAlwaysBlocks(theme, document, await deps.landingStructure()).map(
          (block) => ({ block, origin: LEGACY_ALWAYS_ORIGIN }),
        );

  return resolveBlockData({ ...options, extraBlocks });
}
