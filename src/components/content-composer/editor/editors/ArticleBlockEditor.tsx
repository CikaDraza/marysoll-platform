import type { ArticleBlock } from "@/lib/content/schemas/landing-blocks";
import { Field } from "../EditorFields";

export function ArticleBlockEditor({ block, onChange }: {
  block: ArticleBlock;
  onChange: (block: ArticleBlock) => void;
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
    </>
  );
}
