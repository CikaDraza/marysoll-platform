"use client";

import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import type { ContentBlock, LandingBlockType } from "@/lib/content/schemas/landing-blocks";
import { createContentBlockId } from "@/lib/content/editor/blockFactories";
import {
  addBlock,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  replaceBlock,
  toggleVisibility,
  normalizePriorities,
} from "@/lib/content/editor/blockOperations";
import { validateContentBlock } from "@/lib/content/validation/contentBlockValidation";
import { BlockCard } from "./BlockCard";
import { BlockPicker } from "./BlockPicker";
import { InvalidBlockCard } from "./InvalidBlockCard";
import type { SlugOption } from "./types";

interface Props {
  blocks: ContentBlock[];
  slugOptions?: SlugOption[];
  onChange: (blocks: ContentBlock[]) => void;
}

export function ContentBlocksEditor({ blocks, slugOptions = [], onChange }: Props) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blocks[0]?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const effectiveSelectedId =
    selectedBlockId === null || blocks.some(({ id }) => id === selectedBlockId)
      ? selectedBlockId
      : (blocks[0]?.id ?? null);

  const handleAdd = (type: LandingBlockType) => {
    const id = createContentBlockId();
    onChange(addBlock(blocks, type, { afterBlockId: effectiveSelectedId, idFactory: () => id }));
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
      {blocks.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Prazan sadržaj</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Dodajte prvi blok da započnete ručno uređivanje.</p>
        </div>
      )}

      {blocks.map((rawBlock, index) => {
        const validation = validateContentBlock(rawBlock);
        if (!validation.block) {
          return (
            <InvalidBlockCard
              key={`${validation.blockId}-${index}`}
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
            selected={block.id === effectiveSelectedId}
            first={index === 0}
            last={index === blocks.length - 1}
            slugOptions={slugOptions}
            onSelect={() =>
              setSelectedBlockId(
                block.id === effectiveSelectedId ? null : block.id,
              )
            }
            onChange={(replacement) =>
              onChange(replaceBlock(blocks, block.id, replacement))
            }
            onMove={(direction) =>
              onChange(moveBlock(blocks, block.id, direction))
            }
            onToggleVisibility={() =>
              onChange(toggleVisibility(blocks, block.id))
            }
            onDuplicate={() => handleDuplicate(block.id)}
            onDelete={() => handleDelete(block.id)}
          />
        );
      })}

      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        onClick={() => setPickerOpen((open) => !open)}
        aria-expanded={pickerOpen}
      >
        <PlusIcon className="h-4 w-4" /> Dodaj blok
      </button>

      {pickerOpen && <BlockPicker onPick={handleAdd} />}
    </div>
  );
}

export type { SlugOption } from "./types";
