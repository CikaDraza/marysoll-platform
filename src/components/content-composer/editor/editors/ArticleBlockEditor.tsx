import type { ArticleBlock } from "@/lib/content/schemas/landing-blocks";
import { Field } from "../EditorFields";
import { ImageMediaField } from "../MediaFields";
import { blockImageAspectHint } from "@/lib/content/render/imageFraming";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";

export function ArticleBlockEditor({ block, mediaAdapter, onChange }: {
  block: ArticleBlock;
  onChange: (block: ArticleBlock) => void;
  mediaAdapter?: ContentMediaAuthoringAdapter;
}) {
  return (
    <>
      <Field label="Naslov" value={block.title} onChange={(title) => onChange({ ...block, title })} />
      <Field
        label="Pasusi (jedan po redu)"
        textarea
        rows={4}
        value={block.paragraphs.join("\n")}
        onChange={(value) => onChange({ ...block, paragraphs: value.split("\n") })}
      />
      <ImageMediaField image={block.image} adapter={mediaAdapter} aspectHint={blockImageAspectHint("ArticleBlock")} onChange={(image) => onChange({ ...block, image })} />
    </>
  );
}
