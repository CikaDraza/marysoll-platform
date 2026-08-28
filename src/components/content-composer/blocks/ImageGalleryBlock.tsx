import type { ImageGalleryBlock as ImageGalleryBlockType } from "@/lib/content/schemas/landing-blocks";
import { ContentImage } from "./ContentImage";

export default function ImageGalleryBlock({ block }: { block: ImageGalleryBlockType }) {
  return <section id={block.id} className="px-6 py-12 text-gray-950 lg:px-8"><div className="mx-auto max-w-6xl">
    {block.title && <h2 className="mb-6 text-2xl font-bold">{block.title}</h2>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(Array.isArray(block.images) ? block.images : []).map((image) => <figure key={image.id} className="min-w-0"><ContentImage src={image.src} alt={image.alt} className="aspect-[4/3] w-full rounded-xl object-cover" />{image.caption && <figcaption className="mt-2 text-sm text-gray-600">{image.caption}</figcaption>}</figure>)}</div>
  </div></section>;
}
