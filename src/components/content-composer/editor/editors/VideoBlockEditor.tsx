import type { VideoBlock } from "@/lib/content/schemas/landing-blocks";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";
import { AssetMediaField } from "../MediaFields";
import { Field, inputClassName, labelClassName } from "../EditorFields";

export function VideoBlockEditor({ block, mediaAdapter, onChange }: { block: VideoBlock; mediaAdapter?: ContentMediaAuthoringAdapter; onChange: (block: VideoBlock) => void }) {
  const provider = block.source?.provider ?? "youtube";
  return <>
    <Field label="Naslov (opciono)" value={block.title ?? ""} onChange={(title) => onChange({ ...block, title })} />
    <div><label className={labelClassName}>Izvor</label><select className={inputClassName} value={provider} onChange={(event) => {
      const next = event.target.value as "youtube" | "vimeo" | "upload";
      onChange({ ...block, source: next === "upload" ? { provider: next, media: { src: "" } } : { provider: next, url: "" } });
    }}><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option><option value="upload">Otpremjen video</option></select></div>
    {provider === "upload" ? <AssetMediaField kind="video" label="Video fajl" adapter={mediaAdapter} asset={block.source?.provider === "upload" ? block.source.media : undefined} onChange={(media) => onChange({ ...block, source: media ? { provider: "upload", media } : undefined })} /> : <Field label={`${provider === "youtube" ? "YouTube" : "Vimeo"} URL`} value={block.source && block.source.provider !== "upload" ? block.source.url : ""} onChange={(url) => onChange({ ...block, source: { provider, url } })} />}
    <Field label="Opis videa (opciono)" textarea rows={2} value={block.caption ?? ""} onChange={(caption) => onChange({ ...block, caption })} />
  </>;
}
