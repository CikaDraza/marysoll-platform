"use client";

import { useState } from "react";
import type { VideoBlock as VideoBlockType } from "@/lib/content/schemas/landing-blocks";
import { resolveVideoSource } from "@/lib/content/media/videoSource";

export default function VideoBlock({ block }: { block: VideoBlockType }) {
  const source = resolveVideoSource(block.source);
  const [failedUploadSrc, setFailedUploadSrc] = useState<string | null>(null);
  const uploadFailed = source.kind === "file" && failedUploadSrc === source.src;
  return <section id={block.id} className="px-6 py-12 text-gray-950 lg:px-8">
    <div className="mx-auto max-w-4xl">
      {block.title && <h2 className="mb-5 text-2xl font-bold tracking-tight">{block.title}</h2>}
      {source.kind === "embed" && <iframe className="aspect-video w-full rounded-xl border-0 bg-black" src={source.src} title={block.title || "Video sadržaj"} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />}
      {source.kind === "file" && !uploadFailed && <video className="aspect-video w-full rounded-xl bg-black" controls preload="metadata" onError={() => setFailedUploadSrc(source.src)}><source src={source.src} />Vaš pregledač ne podržava video.</video>}
      {uploadFailed && <div role="status" className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-600">Video trenutno nije dostupan.</div>}
      {source.kind === "unavailable" && <div role="status" className="rounded-lg border border-dashed border-gray-300 p-5 text-sm text-gray-600">Video trenutno nije dostupan.{source.href && <> <a className="underline" href={source.href}>Otvori izvor</a>.</>}</div>}
      {block.caption && <p className="mt-3 text-sm text-gray-600">{block.caption}</p>}
    </div>
  </section>;
}
