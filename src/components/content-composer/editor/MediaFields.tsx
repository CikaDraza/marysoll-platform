"use client";

import { useState } from "react";
import type { ContentAssetRef, ContentImageRef } from "@/lib/content/schemas/landing-blocks";
import type { ContentMediaAuthoringAdapter, ContentMediaKind } from "@/lib/content/media/authoring";
import { uploadContentMedia } from "@/lib/content/media/authoring";
import { Field, inputClassName, labelClassName } from "./EditorFields";
import { ContentImage } from "@/components/content-composer/blocks/ContentImage";

const ACCEPT: Record<ContentMediaKind, string> = {
  image: "image/jpeg,image/png,image/webp",
  video: "video/*",
  file: "application/pdf,image/jpeg,image/png,image/webp",
};

export type MediaFieldStatus = "IDLE" | "UPLOADING" | "READY" | "ERROR";

export function AssetMediaField({ kind, label, asset, adapter, onChange }: {
  kind: ContentMediaKind;
  label: string;
  asset?: ContentAssetRef;
  adapter?: ContentMediaAuthoringAdapter;
  onChange: (asset?: ContentAssetRef) => void;
}) {
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");
  const status: MediaFieldStatus = state === "uploading" ? "UPLOADING" : state === "error" ? "ERROR" : asset?.src ? "READY" : "IDLE";
  return <fieldset className="space-y-2 rounded-md border border-gray-200 p-2 dark:border-gray-700">
    <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</legend>
    <div>
      <label className={labelClassName}>Trajna URL adresa</label>
      <input className={inputClassName} type="url" value={asset?.src ?? ""} placeholder="https://…" onChange={(event) => onChange(event.target.value ? { ...asset, src: event.target.value } : undefined)} />
    </div>
    {asset?.fileName && <p className="text-xs text-gray-500">{asset.fileName}{asset.mimeType ? ` · ${asset.mimeType}` : ""}{asset.sizeBytes != null ? ` · ${(asset.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ""}</p>}
    <span className="sr-only" role="status">Media status: {status}</span>
    <div className="flex flex-wrap items-center gap-2">
      <label className={`cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold ${!adapter || state === "uploading" ? "pointer-events-none opacity-50" : ""}`}>
        {state === "uploading" ? "Otpremanje…" : asset ? "Zameni fajl" : "Otpremi fajl"}
        <input className="sr-only" type="file" accept={ACCEPT[kind]} disabled={!adapter || state === "uploading"} onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || !adapter) return;
          setState("uploading"); setError("");
          const result = await uploadContentMedia(adapter, kind, file, asset);
          if (result.status === "ready") { onChange(result.asset); setState("idle"); }
          else { setError(result.message); setState("error"); }
        }} />
      </label>
      {asset && <button type="button" className="text-xs font-semibold text-red-600" onClick={() => { onChange(undefined); setError(""); setState("idle"); }}>Ukloni referencu</button>}
    </div>
    {!adapter && <p className="text-xs text-gray-500">Upload nije dostupan u ovom hostu; unesite trajni URL.</p>}
    {error && <p role="alert" className="text-xs text-red-600">{error} Postojeća referenca je sačuvana.</p>}
  </fieldset>;
}

export function ImageMediaField({ label = "Slika", image, adapter, onChange }: {
  label?: string;
  image?: ContentImageRef;
  adapter?: ContentMediaAuthoringAdapter;
  onChange: (image?: ContentImageRef) => void;
}) {
  return <div className="space-y-2">
    {image?.src && <ContentImage src={image.src} alt={image.alt || "Pregled izabrane slike"} className="h-32 w-full rounded-md object-cover" />}
    <AssetMediaField kind="image" label={label} asset={image} adapter={adapter} onChange={(asset) => onChange(asset ? { ...asset, alt: image?.alt ?? "", caption: image?.caption } : undefined)} />
    {image && <><Field label="Alt tekst" value={image.alt} onChange={(alt) => onChange({ ...image, alt })} /><Field label="Opis slike (opciono)" value={image.caption ?? ""} onChange={(caption) => onChange({ ...image, caption })} /></>}
  </div>;
}
