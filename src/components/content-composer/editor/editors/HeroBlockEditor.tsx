import type { HeroBlock } from "@/lib/content/schemas/landing-blocks";
import { CtaField, Field } from "../EditorFields";
import type { SlugOption } from "../types";
import { ImageMediaField } from "../MediaFields";
import { heroImageAspectHint } from "@/lib/content/render/imageFraming";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";

export function HeroBlockEditor({ block, slugOptions, mediaAdapter, onChange }: {
  block: HeroBlock;
  slugOptions: SlugOption[];
  onChange: (block: HeroBlock) => void;
  mediaAdapter?: ContentMediaAuthoringAdapter;
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
      {(block.images ?? []).map((image, index) => <div key={`${image.src}-${index}`} className="space-y-2 rounded border p-2">
        <div className="flex justify-end gap-2 text-xs"><button type="button" disabled={index === 0} onClick={() => { const images = [...(block.images ?? [])]; [images[index - 1], images[index]] = [images[index], images[index - 1]]; onChange({ ...block, images }); }}>Levo</button><button type="button" disabled={index === (block.images?.length ?? 0) - 1} onClick={() => { const images = [...(block.images ?? [])]; [images[index + 1], images[index]] = [images[index], images[index + 1]]; onChange({ ...block, images }); }}>Desno</button></div>
        <ImageMediaField label={`Hero slika ${index + 1}`} image={image} adapter={mediaAdapter} aspectHint={heroImageAspectHint((block.images ?? []).length, index)} onChange={(next) => onChange({ ...block, images: next ? (block.images ?? []).map((current, itemIndex) => itemIndex === index ? next : current) : (block.images ?? []).filter((_, itemIndex) => itemIndex !== index) })} />
      </div>)}
      <button type="button" disabled={(block.images?.length ?? 0) >= 4} className="rounded border px-3 py-2 text-xs font-semibold disabled:opacity-50" onClick={() => onChange({ ...block, images: [...(block.images ?? []), { src: "", alt: "" }] })}>Dodaj hero sliku</button>
    </>
  );
}
