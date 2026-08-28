import type { CalloutBlock } from "@/lib/content/schemas/landing-blocks";
import { Field, inputClassName, labelClassName } from "../EditorFields";

export function CalloutBlockEditor({ block, onChange }: { block: CalloutBlock; onChange: (block: CalloutBlock) => void }) {
  return <><div><label className={labelClassName}>Vrsta poruke</label><select className={inputClassName} value={block.variant} onChange={(event) => onChange({ ...block, variant: event.target.value as CalloutBlock["variant"] })}><option value="info">Informacija</option><option value="tip">Savet</option><option value="important">Važno</option><option value="warning">Upozorenje</option></select></div><Field label="Naslov (opciono)" value={block.title ?? ""} onChange={(title) => onChange({ ...block, title })} /><Field label="Sadržaj" textarea rows={4} value={block.content} onChange={(content) => onChange({ ...block, content })} /></>;
}
