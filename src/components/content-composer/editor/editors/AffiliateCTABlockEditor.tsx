import type { AffiliateCTABlock } from "@/lib/content/schemas/landing-blocks";
import { CtaField, Field } from "../EditorFields";
import type { SlugOption } from "../types";
import { ImageMediaField } from "../MediaFields";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";

export function AffiliateCTABlockEditor({ block, slugOptions, mediaAdapter, onChange }: {
  block: AffiliateCTABlock;
  slugOptions: SlugOption[];
  onChange: (block: AffiliateCTABlock) => void;
  mediaAdapter?: ContentMediaAuthoringAdapter;
}) {
  return (
    <>
      <Field label="Eyebrow" value={block.eyebrow ?? ""} onChange={(eyebrow) => onChange({ ...block, eyebrow })} />
      <Field label="Naslov" value={block.title} onChange={(title) => onChange({ ...block, title })} />
      <Field label="Opis" textarea rows={2} value={block.description ?? ""} onChange={(description) => onChange({ ...block, description })} />
      <CtaField
        ctaLabel={block.ctaLabel}
        href={block.href}
        slugOptions={slugOptions}
        onLabel={(ctaLabel) => onChange({ ...block, ctaLabel })}
        onHref={(href) => onChange({ ...block, href })}
      />
      <ImageMediaField image={block.image} adapter={mediaAdapter} onChange={(image) => onChange({ ...block, image })} />
    </>
  );
}
