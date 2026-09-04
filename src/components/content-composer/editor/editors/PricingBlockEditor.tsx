import { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { PricingBlock } from "@/lib/content/schemas/landing-blocks";
import { CtaField, Field } from "../EditorFields";
import type { SlugOption } from "../types";

export function PricingBlockEditor({ block, slugOptions, onChange }: {
  block: PricingBlock;
  slugOptions: SlugOption[];
  onChange: (block: PricingBlock) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <>
      <Field label="Naslov" value={block.title} onChange={(title) => onChange({ ...block, title })} />
      <Field label="Opis" value={block.description ?? ""} onChange={(description) => onChange({ ...block, description })} />
      {block.items.map((item, index) => (
        <div key={index} className="space-y-2 rounded border border-gray-200 p-2 dark:border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-500">Stavka {index + 1}</span>
            {confirmDelete === index ? (
              <span className="flex items-center gap-2 text-xs">
                <span>Obrisati?</span>
                <button
                  type="button"
                  className="font-semibold text-red-600"
                  onClick={() => {
                    onChange({ ...block, items: block.items.filter((_, itemIndex) => itemIndex !== index) });
                    setConfirmDelete(null);
                  }}
                >
                  Da
                </button>
                <button type="button" onClick={() => setConfirmDelete(null)}>Ne</button>
              </span>
            ) : (
              <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={`Obriši stavku ${index + 1}`} onClick={() => setConfirmDelete(index)}>
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <Field
            label="Naziv"
            value={item.title}
            onChange={(title) => onChange({
              ...block,
              items: block.items.map((current, itemIndex) => itemIndex === index ? { ...current, title } : current),
            })}
          />
          <Field
            label="Opis"
            value={item.description ?? ""}
            onChange={(description) => onChange({
              ...block,
              items: block.items.map((current, itemIndex) => itemIndex === index ? { ...current, description } : current),
            })}
          />
          <CtaField
            ctaLabel={item.ctaLabel ?? ""}
            href={item.href ?? ""}
            slugOptions={slugOptions}
            onLabel={(ctaLabel) => onChange({
              ...block,
              items: block.items.map((current, itemIndex) => itemIndex === index ? { ...current, ctaLabel } : current),
            })}
            onHref={(href) => onChange({
              ...block,
              items: block.items.map((current, itemIndex) => itemIndex === index ? { ...current, href } : current),
            })}
          />
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        onClick={() => onChange({ ...block, items: [...block.items, { title: "" }] })}
      >
        <PlusIcon className="h-4 w-4" /> Dodaj stavku
      </button>
    </>
  );
}
