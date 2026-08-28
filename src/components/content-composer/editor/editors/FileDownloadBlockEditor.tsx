import type { FileDownloadBlock } from "@/lib/content/schemas/landing-blocks";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";
import { AssetMediaField } from "../MediaFields";
import { Field } from "../EditorFields";

export function FileDownloadBlockEditor({ block, mediaAdapter, onChange }: { block: FileDownloadBlock; mediaAdapter?: ContentMediaAuthoringAdapter; onChange: (block: FileDownloadBlock) => void }) {
  return <><Field label="Naziv materijala" value={block.title} onChange={(title) => onChange({ ...block, title })} /><Field label="Kratak opis" textarea rows={2} value={block.description ?? ""} onChange={(description) => onChange({ ...block, description })} /><AssetMediaField kind="file" label="Dokument" asset={block.file ?? undefined} adapter={mediaAdapter} onChange={(file) => onChange({ ...block, file: file ?? null, title: block.title.trim() ? block.title : file?.fileName?.replace(/\.[^.]+$/, "") || "" })} /><Field label="Tekst dugmeta" value={block.ctaLabel ?? ""} onChange={(ctaLabel) => onChange({ ...block, ctaLabel })} /></>;
}
