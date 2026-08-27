import type { ComponentType } from "react";
import { blockRegistry } from "@/lib/content/registry/blockRegistry";
import type { LandingBlock } from "@/lib/content/schemas/landing-blocks";

export function visibleContentBlocks(
  blocks: readonly LandingBlock[],
): LandingBlock[] {
  return [...blocks]
    .filter((block) => block.visibility !== "hidden")
    .sort((a, b) => a.priority - b.priority);
}

export function BlockList({ blocks }: { blocks: readonly LandingBlock[] }) {
  return visibleContentBlocks(blocks).map((block) => {
    const BlockView = blockRegistry[block.type] as ComponentType<{
      block: LandingBlock;
    }>;
    return <BlockView key={block.id} block={block} />;
  });
}
