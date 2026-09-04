import type { ContentBlock, LandingBlockType } from "@/lib/content/schemas/landing-blocks";

/** Prezentacioni pogled; vraća postojeće blokove bez kopiranja ili reordering-a. */
export function visibleContentBlocks(
  blocks: readonly ContentBlock[],
  includeTypes?: readonly LandingBlockType[],
  excludeTypes?: readonly LandingBlockType[],
): ContentBlock[] {
  return blocks.filter(
    ({ type }) =>
      (!includeTypes || includeTypes.includes(type)) &&
      (!excludeTypes || !excludeTypes.includes(type)),
  );
}
