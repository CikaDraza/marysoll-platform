"use client";

import { useState } from "react";
import type { ContentAssetRef, ContentImageRef } from "@/lib/content/schemas/landing-blocks";
import type { ContentMediaAuthoringAdapter, ContentMediaKind } from "@/lib/content/media/authoring";
import { uploadContentMedia } from "@/lib/content/media/authoring";
import { Field, inputClassName, labelClassName } from "./EditorFields";
import { MediaGallery } from "./MediaGallery";
import { FocalPointPicker } from "./FocalPointPicker";

const ACCEPT: Record<ContentMediaKind, string> = {
  image: "image/jpeg,image/png,image/webp",
  video: "video/*",
  file: "application/pdf,image/jpeg,image/png,image/webp",
};

export type MediaFieldStatus = "IDLE" | "UPLOADING" | "READY" | "ERROR";

type MediaSource = "gallery" | "upload" | "url";

const SOURCE_LABEL: Record<MediaSource, string> = {
  gallery: "Galerija",
  upload: "Otpremi",
  url: "URL",
};

export function AssetMediaField({ kind, label, asset, adapter, onChange }: {
  kind: ContentMediaKind;
  label: string;
  asset?: ContentAssetRef;
  adapter?: ContentMediaAuthoringAdapter;
  onChange: (asset?: ContentAssetRef) => void;
}) {
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");
  // Dokumenti nemaju galeriju, pa za njih „Otpremi" ostaje prvi izbor.
  const [source, setSource] = useState<MediaSource>(kind === "file" ? "upload" : "gallery");
  const status: MediaFieldStatus = state === "uploading" ? "UPLOADING" : state === "error" ? "ERROR" : asset?.src ? "READY" : "IDLE";
  return <fieldset className="space-y-2 rounded-md border border-gray-200 p-2 dark:border-gray-700">
    <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</legend>

    <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
      {(Object.keys(SOURCE_LABEL) as MediaSource[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setSource(option)}
          className={`flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
            option === source
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          {SOURCE_LABEL[option]}
        </button>
      ))}
    </div>

    {source === "gallery" && (
      <MediaGallery
        kind={kind}
        selectedSrc={asset?.src}
        onSelect={(src, fileName) => onChange({ ...asset, src, fileName: fileName ?? asset?.fileName })}
      />
    )}

    {source === "url" && (
      <div>
        <label className={labelClassName}>Trajna URL adresa</label>
        <input className={inputClassName} type="url" value={asset?.src ?? ""} placeholder="https://…" onChange={(event) => onChange(event.target.value ? { ...asset, src: event.target.value } : undefined)} />
      </div>
    )}

    {asset?.fileName && <p className="text-xs text-gray-500">{asset.fileName}{asset.mimeType ? ` · ${asset.mimeType}` : ""}{asset.sizeBytes != null ? ` · ${(asset.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ""}</p>}
    <span className="sr-only" role="status">Media status: {status}</span>
    {source === "upload" && (
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
    </div>
    )}
    {asset && <button type="button" className="text-xs font-semibold text-red-600" onClick={() => { onChange(undefined); setError(""); setState("idle"); }}>Ukloni referencu</button>}
    {source === "upload" && !adapter && <p className="text-xs text-gray-500">Upload nije dostupan u ovom hostu; unesite trajni URL.</p>}
    {error && <p role="alert" className="text-xs text-red-600">{error} Postojeća referenca je sačuvana.</p>}
  </fieldset>;
}

export function ImageMediaField({ label = "Slika", image, adapter, onChange, aspectHint, defaultAlt }: {
  label?: string;
  image?: ContentImageRef;
  adapter?: ContentMediaAuthoringAdapter;
  onChange: (image?: ContentImageRef) => void;
  /** Odnos kadra u kome će se slika stvarno prikazati, iz same teme. */
  aspectHint?: string;
  /**
   * Polazni alt — naslov bloka ili sadržaja.
   *
   * Objava traži alt za svaku sliku, pa bi bez ovoga autor posle pisanja
   * morao da obilazi svaku sliku i traži gde nedostaje. Bolji opis se piše
   * kad ima smisla; prazan alt ne sme da bude prepreka.
   */
  defaultAlt?: string;
}) {
  return <div className="space-y-2">
    {image?.src ? (
      <FocalPointPicker
        src={image.src}
        alt={image.alt || "Pregled izabrane slike"}
        focalPoint={image.focalPoint}
        aspectHint={aspectHint}
        onChange={(focalPoint) => onChange({ ...image, focalPoint })}
      />
    ) : (
      aspectHint && <p className="text-xs text-gray-500">Preporučeni kadar: {aspectHint}</p>
    )}
    <AssetMediaField kind="image" label={label} asset={image} adapter={adapter} onChange={(asset) => onChange(asset ? { ...asset, alt: image?.alt || defaultAlt?.trim() || "", caption: image?.caption } : undefined)} />
    {image && <><Field label="Alt tekst" value={image.alt} onChange={(alt) => onChange({ ...image, alt })} /><Field label="Opis slike (opciono)" value={image.caption ?? ""} onChange={(caption) => onChange({ ...image, caption })} /></>}
  </div>;
}
