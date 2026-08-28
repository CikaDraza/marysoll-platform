import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeSlashIcon,
  Square2StackIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import type { ContentBlockStatus } from "@/lib/content/validation/contentBlockValidation";
import { CONTENT_BLOCK_LABELS } from "./BlockPicker";
import { BlockFields } from "./BlockFields";
import type { SlugOption } from "./types";

const STATUS_LABEL: Record<ContentBlockStatus, string> = {
  VALID: "Spremno",
  INCOMPLETE: "Nepotpun",
  INVALID: "Greška",
  HIDDEN: "Sakriven",
};

const STATUS_CLASS: Record<ContentBlockStatus, string> = {
  VALID: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  INCOMPLETE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  INVALID: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  HIDDEN: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

function blockSummary(block: ContentBlock): string {
  return block.title.trim() || "Bez naslova";
}

export function BlockCard({
  block,
  status,
  selected,
  first,
  last,
  slugOptions,
  onSelect,
  onChange,
  onMove,
  onToggleVisibility,
  onDuplicate,
  onDelete,
}: {
  block: ContentBlock;
  status: ContentBlockStatus;
  selected: boolean;
  first: boolean;
  last: boolean;
  slugOptions: SlugOption[];
  onSelect: () => void;
  onChange: (block: ContentBlock) => void;
  onMove: (direction: -1 | 1) => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <section
      className={`rounded-lg border p-3 ${
        selected
          ? "border-gray-400 ring-1 ring-gray-300 dark:border-gray-500 dark:ring-gray-700"
          : "border-gray-200 dark:border-gray-700"
      } ${status === "HIDDEN" ? "opacity-65" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={onSelect}
          aria-expanded={selected}
        >
          {selected ? <ChevronUpIcon className="h-4 w-4 shrink-0" /> : <ChevronDownIcon className="h-4 w-4 shrink-0" />}
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {CONTENT_BLOCK_LABELS[block.type]}
            </span>
            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
              {blockSummary(block)}
            </span>
          </span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${STATUS_CLASS[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </button>

        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <button type="button" onClick={() => onMove(-1)} disabled={first} className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800" aria-label="Pomeri gore">
            <ArrowUpIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={last} className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800" aria-label="Pomeri dole">
            <ArrowDownIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={onToggleVisibility} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={status === "HIDDEN" ? "Prikaži" : "Sakrij"}>
            {status === "HIDDEN" ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onDuplicate} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Dupliraj">
            <Square2StackIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" aria-label="Obriši blok">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
          <span>Obrisati ovaj blok i sav njegov sadržaj?</span>
          <span className="flex gap-2">
            <button type="button" className="font-semibold" onClick={() => setConfirmDelete(false)}>Odustani</button>
            <button type="button" className="rounded bg-red-600 px-2 py-1 font-semibold text-white" onClick={onDelete}>Obriši</button>
          </span>
        </div>
      )}

      {selected && (
        <div className="mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <BlockFields block={block} slugOptions={slugOptions} onChange={onChange} />
        </div>
      )}
    </section>
  );
}
