import { PlusIcon, TrashIcon, ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import type { ImageGalleryBlock } from "@/lib/content/schemas/landing-blocks";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";
import { createContentBlockId } from "@/lib/content/editor/blockFactories";
import { Field } from "../EditorFields";
import { ImageMediaField } from "../MediaFields";
import { moveMediaItem } from "@/lib/content/media/authoring";

export function ImageGalleryBlockEditor({ block, mediaAdapter, onChange }: { block: ImageGalleryBlock; mediaAdapter?: ContentMediaAuthoringAdapter; onChange: (block: ImageGalleryBlock) => void }) {
  const move = (index: number, offset: -1 | 1) => onChange({ ...block, images: moveMediaItem(block.images, index, offset) });
  return <><Field label="Naslov galerije (opciono)" value={block.title ?? ""} onChange={(title) => onChange({ ...block, title })} />{block.images.map((image, index) => <div key={image.id} className="space-y-2 rounded border p-2"><div className="flex justify-end gap-2"><button type="button" disabled={index === 0} aria-label="Pomeri sliku levo" onClick={() => move(index, -1)}><ArrowLeftIcon className="h-4 w-4" /></button><button type="button" disabled={index === block.images.length - 1} aria-label="Pomeri sliku desno" onClick={() => move(index, 1)}><ArrowRightIcon className="h-4 w-4" /></button><button type="button" className="text-red-600" aria-label="Ukloni sliku" onClick={() => onChange({ ...block, images: block.images.filter(({ id }) => id !== image.id) })}><TrashIcon className="h-4 w-4" /></button></div><ImageMediaField label={`Slika ${index + 1}`} image={image} adapter={mediaAdapter} onChange={(next) => onChange({ ...block, images: next ? block.images.map((current) => current.id === image.id ? { ...next, id: image.id } : current) : block.images.filter(({ id }) => id !== image.id) })} /></div>)}<button type="button" className="inline-flex items-center gap-1 rounded border px-3 py-2 text-xs font-semibold" onClick={() => onChange({ ...block, images: [...block.images, { id: createContentBlockId(), src: "", alt: "" }] })}><PlusIcon className="h-4 w-4" /> Dodaj sliku</button></>;
}
