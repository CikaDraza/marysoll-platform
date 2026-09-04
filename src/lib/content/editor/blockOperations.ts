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
    /** Blok koji je po ugovoru prvi (npr. primarni video) ide na početak. */
    atStart?: boolean;
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
  const insertAt = options.atStart
    ? 0
    : selectedIndex >= 0
      ? selectedIndex + 1
      : blocks.length;
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

/**
 * Pomeranje u odnosu na VIDLJIVI spisak, ne u odnosu na canonical susedstvo.
 *
 * Host sme da prikaže samo deo `blocks` (npr. Education odvaja video i
 * materijal za preuzimanje u zasebne sekcije). Strelice tada predstavljaju ono
 * što autor vidi: blok menja mesto sa prethodnim/sledećim VIDLJIVIM blokom, a
 * sve preskočeno ostaje na svom canonical mestu. Bez ovoga klik na strelicu
 * menja `blocks[]` bez ijedne vidljive promene — i tiho pravi novu reviziju.
 */
export function moveBlockRelativeToVisible(
  blocks: readonly ContentBlock[],
  visibleBlockIds: readonly string[],
  blockId: string,
  direction: -1 | 1,
): ContentBlock[] {
  const visibleIndex = visibleBlockIds.indexOf(blockId);
  if (visibleIndex < 0) return [...blocks];

  const partnerId = visibleBlockIds[visibleIndex + direction];
  if (partnerId === undefined) return [...blocks];

  const from = blocks.findIndex(({ id }) => id === blockId);
  const to = blocks.findIndex(({ id }) => id === partnerId);
  if (from < 0 || to < 0) return [...blocks];

  const next = [...blocks];
  [next[from], next[to]] = [next[to], next[from]];
  return normalizePriorities(next);
}

export function moveBlock(
  blocks: readonly ContentBlock[],
  blockId: string,
  direction: -1 | 1,
): ContentBlock[] {
  return moveBlockRelativeToVisible(
    blocks,
    blocks.map(({ id }) => id),
    blockId,
    direction,
  );
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
