import type { AffiliateCTABlock } from "@/lib/content/schemas/landing-blocks";
import { CtaField, Field } from "../EditorFields";
import type { SlugOption } from "../types";

export function AffiliateCTABlockEditor({ block, slugOptions, onChange }: {
  block: AffiliateCTABlock;
  slugOptions: SlugOption[];
  onChange: (block: AffiliateCTABlock) => void;
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
    </>
  );
}
