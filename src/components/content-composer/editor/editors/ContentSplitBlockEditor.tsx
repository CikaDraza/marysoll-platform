import type { ContentSplitBlock } from "@/lib/content/schemas/landing-blocks";
import { Field } from "../EditorFields";

export function ContentSplitBlockEditor({ block, onChange }: {
  block: ContentSplitBlock;
  onChange: (block: ContentSplitBlock) => void;
}) {
  return (
    <>
      <Field label="Naslov" value={block.title} onChange={(title) => onChange({ ...block, title })} />
      <Field label="Sadržaj" textarea rows={4} value={block.content} onChange={(content) => onChange({ ...block, content })} />
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={Boolean(block.reverse)} onChange={(event) => onChange({ ...block, reverse: event.target.checked })} />
        Obrnuti raspored
      </label>
    </>
  );
}
