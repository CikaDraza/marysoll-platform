import type { ContentSplitBlock } from "@/lib/content/schemas/landing-blocks";
import { Field } from "../EditorFields";
import { ImageMediaField } from "../MediaFields";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";

export function ContentSplitBlockEditor({ block, mediaAdapter, onChange }: {
  block: ContentSplitBlock;
  onChange: (block: ContentSplitBlock) => void;
  mediaAdapter?: ContentMediaAuthoringAdapter;
}) {
  return (
    <>
      <Field label="Naslov" value={block.title} onChange={(title) => onChange({ ...block, title })} />
      <Field label="Sadržaj" textarea rows={4} value={block.content} onChange={(content) => onChange({ ...block, content })} />
      <ImageMediaField image={block.image} adapter={mediaAdapter} onChange={(image) => onChange({ ...block, image })} />
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={Boolean(block.reverse)} onChange={(event) => onChange({ ...block, reverse: event.target.checked })} />
        Obrnuti raspored
      </label>
    </>
  );
}
