import { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { FeatureBlock } from "@/lib/content/schemas/landing-blocks";
import { Field } from "../EditorFields";
import { ImageMediaField } from "../MediaFields";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";

export function FeatureBlockEditor({ block, mediaAdapter, onChange }: {
  block: FeatureBlock;
  onChange: (block: FeatureBlock) => void;
  mediaAdapter?: ContentMediaAuthoringAdapter;
}) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <>
      <Field label="Naslov" value={block.title} onChange={(title) => onChange({ ...block, title })} />
      <Field label="Uvod" value={block.intro ?? ""} onChange={(intro) => onChange({ ...block, intro })} />
      {block.sections.map((section, index) => (
        <div key={index} className="space-y-2 rounded border border-gray-200 p-2 dark:border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-500">Sekcija {index + 1}</span>
            {confirmDelete === index ? (
              <span className="flex items-center gap-2 text-xs">
                <span>Obrisati?</span>
                <button
                  type="button"
                  className="font-semibold text-red-600"
                  onClick={() => {
                    onChange({ ...block, sections: block.sections.filter((_, itemIndex) => itemIndex !== index) });
                    setConfirmDelete(null);
                  }}
                >
                  Da
                </button>
                <button type="button" onClick={() => setConfirmDelete(null)}>Ne</button>
              </span>
            ) : (
              <button type="button" className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={`Obriši sekciju ${index + 1}`} onClick={() => setConfirmDelete(index)}>
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <Field
            label="Naslov"
            value={section.title}
            onChange={(title) => onChange({
              ...block,
              sections: block.sections.map((item, itemIndex) => itemIndex === index ? { ...item, title } : item),
            })}
          />
          <ImageMediaField image={section.image} adapter={mediaAdapter} defaultAlt={section.title || block.title} onChange={(image) => onChange({ ...block, sections: block.sections.map((item, itemIndex) => itemIndex === index ? { ...item, image } : item) })} />
          <Field
            label="Pasusi (jedan po redu)"
            textarea
            rows={3}
            value={section.paragraphs.join("\n")}
            onChange={(value) => onChange({
              ...block,
              sections: block.sections.map((item, itemIndex) => itemIndex === index ? { ...item, paragraphs: value.split("\n") } : item),
            })}
          />
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        onClick={() => onChange({ ...block, sections: [...block.sections, { title: "", paragraphs: [""] }] })}
      >
        <PlusIcon className="h-4 w-4" /> Dodaj sekciju
      </button>
    </>
  );
}
