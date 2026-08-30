import type { ComponentType } from "react";
import { blockRegistry } from "@/lib/content/registry/blockRegistry";
import type { LandingBlock } from "@/lib/content/schemas/landing-blocks";

/**
 * Ko nosi `h1` na strani.
 *
 * `page`   — blokovi su cela strana (newsletter landing): hero sme `h1`.
 * `section` — strana već ima svoj `h1` (Education detalj, gde naslov dolazi iz
 *             `EducationContent.title`), pa blok mora da počne od `h2`.
 *
 * Bez ovoga bi Education članak imao dva `h1` i time pokvario i pristupačnost
 * i strukturu za pretraživače.
 */
export type BlockHeadingScope = "page" | "section";

export function visibleContentBlocks(
  blocks: readonly LandingBlock[],
): LandingBlock[] {
  return [...blocks]
    .filter((block) => block.visibility !== "hidden")
    .sort((a, b) => a.priority - b.priority);
}

export function BlockList({
  blocks,
  headingScope = "page",
}: {
  blocks: readonly LandingBlock[];
  headingScope?: BlockHeadingScope;
}) {
  return visibleContentBlocks(blocks).map((block) => {
    const BlockView = blockRegistry[block.type] as ComponentType<{
      block: LandingBlock;
      headingScope?: BlockHeadingScope;
    }>;
    return (
      <BlockView key={block.id} block={block} headingScope={headingScope} />
    );
  });
}
