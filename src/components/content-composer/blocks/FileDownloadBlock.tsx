import type { FileDownloadBlock as FileDownloadBlockType } from "@/lib/content/schemas/landing-blocks";

function fileMeta(block: FileDownloadBlockType) {
  const bits = [block.file?.mimeType?.split("/").pop()?.toUpperCase()];
  if (block.file?.sizeBytes != null) bits.push(`${(block.file.sizeBytes / 1024 / 1024).toFixed(1)} MB`);
  return bits.filter(Boolean).join(" · ");
}

export default function FileDownloadBlock({ block }: { block: FileDownloadBlockType }) {
  const available = Boolean(block.file?.src && !/^(blob:|data:)/i.test(block.file.src));
  return <section id={block.id} className="px-6 py-10 lg:px-8"><div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-5 rounded-xl border border-gray-200 p-6 text-gray-950">
    <div><h2 className="text-xl font-bold">{block.title}</h2>{block.description && <p className="mt-2 text-sm text-gray-600">{block.description}</p>} {available && <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">{block.file?.fileName || fileMeta(block)}{block.file?.fileName && fileMeta(block) ? ` · ${fileMeta(block)}` : ""}</p>}</div>
    {available ? <a href={block.file!.src} download={block.file?.fileName} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white">↓ {block.ctaLabel || "Preuzmi"}</a> : <span role="status" className="text-sm text-gray-500">Fajl trenutno nije dostupan.</span>}
  </div></section>;
}
