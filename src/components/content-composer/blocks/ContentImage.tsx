"use client";

import { useState } from "react";

export function ContentImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return <div role="img" aria-label={alt || "Slika nije dostupna"} className={`${className ?? ""} flex items-center justify-center bg-gray-100 p-4 text-center text-sm text-gray-500`}>Slika trenutno nije dostupna.</div>;
  }
  // Provider-neutral content URLs cannot be exhaustively listed in next/image remotePatterns.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}
