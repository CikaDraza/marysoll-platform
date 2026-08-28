import type { HeroBlock } from "@/lib/content/schemas/landing-blocks";
import { CtaField, Field } from "../EditorFields";
import type { SlugOption } from "../types";

export function HeroBlockEditor({ block, slugOptions, onChange }: {
  block: HeroBlock;
  slugOptions: SlugOption[];
  onChange: (block: HeroBlock) => void;
}) {
  return (
    <>
      <Field label="Naslov" value={block.title} onChange={(title) => onChange({ ...block, title })} />
      <Field label="Podnaslov" value={block.subtitle ?? ""} onChange={(subtitle) => onChange({ ...block, subtitle })} />
      <CtaField
        ctaLabel={block.ctaLabel ?? ""}
        href={block.href ?? ""}
        slugOptions={slugOptions}
        onLabel={(ctaLabel) => onChange({ ...block, ctaLabel })}
        onHref={(href) => onChange({ ...block, href })}
      />
    </>
  );
}
