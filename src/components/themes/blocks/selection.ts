/**
 * components/themes/blocks/selection.ts — odluka „šta se renderuje", bez React-a.
 *
 * Sva logika `ThemeBlock`-a i `LegacyAlwaysThemeBlock`-a je ovde, kao čiste
 * funkcije, pa je pokrivena običnim vitest-om (root runner gleda src/**\/*.test.ts,
 * bez jsdom-a). Komponente su tanke ljušture nad ovim.
 *
 * Tri ishoda:
 *   render  → imamo blok i njegove podatke
 *   absent  → bloka nema u dokumentu (sekcija je ugašena) — normalno, bez buke
 *   skip    → anomalija: prijavi telemetriji, ali NIKAD ne obaraj stranu
 */

import type { LayoutBlock, ThemeDocument } from "@panta/theme-engine";
import type {
  BlockSkipEvent,
  ResolvedBlock,
  ResolvedBlockMap,
} from "@/lib/platform/blocks/render-types";
import type { FeatureBlockType } from "@/lib/platform/blocks/types";

export type BlockLookup =
  | { status: "render"; resolved: ResolvedBlock }
  | { status: "absent" }
  | { status: "skip"; event: BlockSkipEvent };

/** Prvi blok traženog tipa u dokumentu (jedna sekcija = jedan blok u T2A). */
export function findDocumentBlock(
  document: ThemeDocument,
  type: FeatureBlockType,
): LayoutBlock | undefined {
  for (const section of document.sections) {
    const block = section.blocks.find((b) => b.type === type);
    if (block) return block;
  }
  return undefined;
}

/**
 * NORMALAN put: postojanje bloka u dokumentu je jedina provera vidljivosti.
 * Nema `enabled` flaga — adapter ga je pretvorio u postojanje bloka.
 */
export function lookupThemeBlock(params: {
  document: ThemeDocument;
  type: FeatureBlockType;
  data: ResolvedBlockMap;
  theme: string;
}): BlockLookup {
  const { document, type, data, theme } = params;

  const block = findDocumentBlock(document, type);
  if (!block) return { status: "absent" };

  const resolved = data[block.id];
  if (!resolved) {
    return {
      status: "skip",
      event: {
        reason: "missing_data",
        type,
        blockId: block.id,
        theme,
        detail: "blok je u dokumentu, ali ga server prolaz nije učitao",
      },
    };
  }

  return { status: "render", resolved };
}
