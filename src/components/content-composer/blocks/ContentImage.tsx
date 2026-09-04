"use client";

import { useState } from "react";

import type { ContentFocalPoint } from "@/lib/content/schemas/landing-blocks";
import { focalObjectPosition } from "@/lib/content/render/imageFraming";

export function ContentImage({ src, alt, className, focalPoint }: { src: string; alt: string; className?: string; focalPoint?: ContentFocalPoint }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return <div role="img" aria-label={alt || "Slika nije dostupna"} className={`${className ?? ""} flex items-center justify-center bg-gray-100 p-4 text-center text-sm text-gray-500`}>Slika trenutno nije dostupna.</div>;
  }
  // Provider-neutral content URLs cannot be exhaustively listed in next/image remotePatterns.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} style={{ objectPosition: focalObjectPosition(focalPoint) }} loading="lazy" onError={() => setFailed(true)} />;
}
