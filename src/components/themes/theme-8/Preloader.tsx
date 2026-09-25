"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { THEME8_WALLPAPER, THEME8_WALLPAPER_BLUR } from "@/lib/theme8/wallpaper";

/**
 * Theme8Preloader — first-paint cover so the very first frame is the graffiti
 * WALL + a big white logo, never the flat background colour.
 *
 * It is server-rendered, so it shows on the first paint *before* hydration (the
 * logo pulse is pure CSS). After hydration it stays up until the wall + logo
 * have actually loaded (min 0.6s, hard cap 3.5s) — important on a slow first
 * mobile load — then fades out and unmounts. Shown on EVERY device; for
 * reduced-motion the pulse + fade are dropped but the loader still appears.
 */
export function Theme8Preloader({
  logo,
  salonName,
}: {
  logo?: string;
  salonName?: string;
}) {
  const logoSrc = logo || "/images/theme-8/logo-byanja.svg";
  const wallRef = useRef<HTMLImageElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  // Wait for the two rendered images; avoid fetching the 1920px raw wall again.
  useEffect(() => {
    const started = Date.now();
    let settled = false;
    let finishTimer: number | undefined;
    const begin = () => {
      if (settled) return;
      settled = true;
      finishTimer = window.setTimeout(() => setLeaving(true), Math.max(0, 600 - (Date.now() - started)));
    };
    const images = [wallRef.current, logoRef.current].filter((image): image is HTMLImageElement => Boolean(image));
    let pending = images.filter((image) => !image.complete).length;
    const onReady = () => {
      pending -= 1;
      if (pending === 0) begin();
    };
    for (const image of images) {
      if (image.complete) continue;
      image.addEventListener("load", onReady, { once: true });
      image.addEventListener("error", onReady, { once: true });
    }
    if (pending === 0) begin();
    const cap = window.setTimeout(begin, 3500);
    return () => {
      window.clearTimeout(cap);
      window.clearTimeout(finishTimer);
      for (const image of images) {
        image.removeEventListener("load", onReady);
        image.removeEventListener("error", onReady);
      }
    };
  }, [logoSrc]);

  // Unmount after the CSS opacity fade finishes.
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setGone(true), 550);
    return () => window.clearTimeout(t);
  }, [leaving]);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      data-leaving={leaving ? "true" : undefined}
      className="y2k-preloader fixed inset-0 z-[200] grid place-items-center bg-y2k-ink"
    >
      <Image
        ref={wallRef}
        src={THEME8_WALLPAPER}
        alt=""
        fill
        loading="eager"
        quality={60}
        placeholder="blur"
        blurDataURL={THEME8_WALLPAPER_BLUR}
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* darken the wall so the white logo pops */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,rgba(20,2,16,0.35),rgba(20,2,16,0.72))]" />
      <Image
        ref={logoRef}
        src={logoSrc}
        alt={salonName ?? "The Lash Room by Anja"}
        width={420}
        height={420}
        loading="eager"
        unoptimized
        className="relative w-[180px] sm:w-[280px] h-auto [filter:brightness(0)_invert(1)] drop-shadow-[0_0_34px_rgba(255,46,151,0.55)] animate-pulse motion-reduce:animate-none"
      />
    </div>
  );
}
