import type {
  ContentBlock,
  LandingBlockType,
} from "@/lib/content/schemas/landing-blocks";
import {
  createContentBlockId,
  createDraftContentBlock,
  type ContentBlockIdFactory,
} from "./blockFactories";

export function normalizePriorities(
  blocks: readonly ContentBlock[],
): ContentBlock[] {
  return blocks.map(
    (block, index) => ({ ...block, priority: index + 1 }) as ContentBlock,
  );
}

export function addBlock(
  blocks: readonly ContentBlock[],
  type: LandingBlockType,
  options: {
    afterBlockId?: string | null;
    idFactory?: ContentBlockIdFactory;
  } = {},
): ContentBlock[] {
  const nextBlock = createDraftContentBlock(
    type,
    blocks.length + 1,
    options.idFactory,
  );
  const selectedIndex = options.afterBlockId
    ? blocks.findIndex(({ id }) => id === options.afterBlockId)
    : -1;
  const insertAt = selectedIndex >= 0 ? selectedIndex + 1 : blocks.length;
  const next = [...blocks];
  next.splice(insertAt, 0, nextBlock);
  return normalizePriorities(next);
}

export function replaceBlock(
  blocks: readonly ContentBlock[],
  blockId: string,
  replacement: ContentBlock,
): ContentBlock[] {
  return blocks.map((block) => (block.id === blockId ? replacement : block));
}

export function moveBlock(
  blocks: readonly ContentBlock[],
  blockId: string,
  direction: -1 | 1,
): ContentBlock[] {
  const from = blocks.findIndex(({ id }) => id === blockId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= blocks.length) return [...blocks];

  const next = [...blocks];
  [next[from], next[to]] = [next[to], next[from]];
  return normalizePriorities(next);
}

function cloneBlock(block: ContentBlock): ContentBlock {
  return structuredClone(block);
}

export function duplicateBlock(
  blocks: readonly ContentBlock[],
  blockId: string,
  idFactory: ContentBlockIdFactory = createContentBlockId,
): ContentBlock[] {
  const index = blocks.findIndex(({ id }) => id === blockId);
  if (index < 0) return [...blocks];

  const duplicate = {
    ...cloneBlock(blocks[index]),
    id: idFactory(),
  } as ContentBlock;
  const next = [...blocks];
  next.splice(index + 1, 0, duplicate);
  return normalizePriorities(next);
}

export function toggleVisibility(
  blocks: readonly ContentBlock[],
  blockId: string,
): ContentBlock[] {
  return blocks.map((block) =>
    block.id === blockId
      ? ({
          ...block,
          visibility: block.visibility === "hidden" ? "visible" : "hidden",
        } as ContentBlock)
      : block,
  );
}

export function deleteBlock(
  blocks: readonly ContentBlock[],
  blockId: string,
): ContentBlock[] {
  return normalizePriorities(blocks.filter(({ id }) => id !== blockId));
}
