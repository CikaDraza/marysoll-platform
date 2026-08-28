import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { ContentBlockValidation } from "@/lib/content/validation/contentBlockValidation";

export function InvalidBlockCard({
  validation,
  onDelete,
}: {
  validation: ContentBlockValidation;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <section className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide">
              {validation.blockType}
            </span>
            <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-700 dark:bg-red-900 dark:text-red-200">
              Greška
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold">
            Struktura bloka nije ispravna. Sadržaj nije automatski odbačen.
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
            {validation.issues.map((issue, index) => (
              <li key={`${issue.path}-${index}`}>
                {issue.path ? `${issue.path}: ` : ""}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="rounded p-1 text-red-700 hover:bg-red-100 dark:text-red-200 dark:hover:bg-red-900"
          aria-label="Obriši neispravan blok"
          onClick={() => setConfirmDelete(true)}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {confirmDelete && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-red-200 pt-2 text-xs dark:border-red-900">
          <span>Obrisati neispravan blok?</span>
          <span className="flex gap-2">
            <button type="button" className="font-semibold" onClick={() => setConfirmDelete(false)}>
              Odustani
            </button>
            <button type="button" className="rounded bg-red-600 px-2 py-1 font-semibold text-white" onClick={onDelete}>
              Obriši
            </button>
          </span>
        </div>
      )}
    </section>
  );
}
