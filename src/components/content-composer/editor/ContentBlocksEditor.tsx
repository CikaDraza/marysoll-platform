"use client";

import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { ContentBlock, LandingBlockType } from "@/lib/content/schemas/landing-blocks";
import { createContentBlockId } from "@/lib/content/editor/blockFactories";
import { visibleContentBlocks } from "@/lib/content/editor/blockPresentation";
import {
  addBlock,
  deleteBlock,
  duplicateBlock,
  moveBlockRelativeToVisible,
  replaceBlock,
  toggleVisibility,
  normalizePriorities,
} from "@/lib/content/editor/blockOperations";
import { validateContentBlock } from "@/lib/content/validation/contentBlockValidation";
import { BlockCard } from "./BlockCard";
import { BlockPicker } from "./BlockPicker";
import { InvalidBlockCard } from "./InvalidBlockCard";
import type { SlugOption } from "./types";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";

interface Props {
  blocks: ContentBlock[];
  slugOptions?: SlugOption[];
  onChange: (blocks: ContentBlock[]) => void;
  mediaAdapter?: ContentMediaAuthoringAdapter;
  /** Tipovi koje ovaj host ne nudi — npr. hero tamo gde ga strana već ima. */
  excludeTypes?: readonly LandingBlockType[];
  /** Ograničava nove izbore, ali nikada ne uklanja postojeće blokove. */
  allowedTypes?: readonly LandingBlockType[];
  /** Prezentacioni filter nad istim canonical blocks nizom. */
  includeTypes?: readonly LandingBlockType[];
  excludeRenderTypes?: readonly LandingBlockType[];
  quickAddType?: LandingBlockType;
  /** Novi blok ide na početak `blocks`, a ne iza izabranog. */
  addAtStart?: boolean;
  /**
   * Blok koji host drži na mestu: bez pomeranja, dupliranja, sakrivanja i
   * brisanja. Ostali blokovi ne mogu da zamene mesto s njim.
   */
  anchoredBlockId?: string | null;
  addButtonLabel?: string;
  emptyTitle?: string;
  emptyHelp?: string;
  hideAddWhenVisible?: boolean;
}

export function ContentBlocksEditor({ blocks, slugOptions = [], mediaAdapter, excludeTypes, allowedTypes, includeTypes, excludeRenderTypes, quickAddType, addAtStart = false, anchoredBlockId = null, addButtonLabel = "Dodaj blok", emptyTitle = "Prazan sadržaj", emptyHelp = "Dodajte prvi blok da započnete ručno uređivanje.", hideAddWhenVisible = false, onChange }: Props) {
  const visibleBlocks = visibleContentBlocks(
    blocks,
    includeTypes,
    excludeRenderTypes,
  );
  // Strelice predstavljaju ovaj spisak, ne canonical `blocks`: usidreni blok
  // nije partner ni u jednoj zameni, pa ostaje na svom mestu.
  const movableBlockIds = visibleBlocks
    .filter(({ id }) => id !== anchoredBlockId)
    .map(({ id }) => id);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(visibleBlocks[0]?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const effectiveSelectedId =
    selectedBlockId === null || visibleBlocks.some(({ id }) => id === selectedBlockId)
      ? selectedBlockId
      : (visibleBlocks[0]?.id ?? null);

  const handleAdd = (type: LandingBlockType) => {
    const id = createContentBlockId();
    onChange(
      addBlock(blocks, type, {
        afterBlockId: effectiveSelectedId,
        atStart: addAtStart,
        idFactory: () => id,
      }),
    );
    setSelectedBlockId(id);
    setPickerOpen(false);
  };

  const handleDelete = (blockId: string) => {
    const index = blocks.findIndex(({ id }) => id === blockId);
    const next = deleteBlock(blocks, blockId);
    onChange(next);
    setSelectedBlockId(next[Math.min(index, next.length - 1)]?.id ?? null);
  };

  const handleDuplicate = (blockId: string) => {
    const id = createContentBlockId();
    onChange(duplicateBlock(blocks, blockId, () => id));
    setSelectedBlockId(id);
  };

  return (
    <div className="space-y-3">
      {visibleBlocks.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{emptyTitle}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{emptyHelp}</p>
        </div>
      )}

      {visibleBlocks.map((rawBlock, visibleIndex) => {
        const index = blocks.findIndex(({ id }) => id === rawBlock.id);
        const anchored = rawBlock.id === anchoredBlockId;
        const movableIndex = movableBlockIds.indexOf(rawBlock.id);
        const validation = validateContentBlock(rawBlock);
        if (!validation.block) {
          return (
            <InvalidBlockCard
              key={`${validation.blockId}-${visibleIndex}`}
              validation={validation}
              onDelete={() =>
                onChange(
                  normalizePriorities(
                    blocks.filter((_, blockIndex) => blockIndex !== index),
                  ),
                )
              }
            />
          );
        }

        const block = validation.block;
        return (
          <BlockCard
            key={block.id}
            block={block}
            status={validation.status}
            issues={validation.issues}
            anchored={anchored}
            selected={block.id === effectiveSelectedId}
            first={anchored || movableIndex <= 0}
            last={anchored || movableIndex === movableBlockIds.length - 1}
            slugOptions={slugOptions}
            mediaAdapter={mediaAdapter}
            onSelect={() =>
              setSelectedBlockId(
                block.id === effectiveSelectedId ? null : block.id,
              )
            }
            onChange={(replacement) =>
              onChange(replaceBlock(blocks, block.id, replacement))
            }
            onMove={(direction) =>
              onChange(
                moveBlockRelativeToVisible(
                  blocks,
                  movableBlockIds,
                  block.id,
                  direction,
                ),
              )
            }
            onToggleVisibility={() =>
              onChange(toggleVisibility(blocks, block.id))
            }
            onDuplicate={() => handleDuplicate(block.id)}
            onDelete={() => handleDelete(block.id)}
          />
        );
      })}

      {(!hideAddWhenVisible || visibleBlocks.length === 0) && <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        onClick={() =>
          quickAddType
            ? handleAdd(quickAddType)
            : setPickerOpen((open) => !open)
        }
        aria-expanded={pickerOpen}
      >
        <PlusIcon className="h-4 w-4" /> {addButtonLabel}
      </button>}

      {pickerOpen && (
        <BlockPicker
          onPick={handleAdd}
          excludeTypes={excludeTypes}
          allowedTypes={allowedTypes}
        />
      )}
    </div>
  );
}

export type { SlugOption } from "./types";
