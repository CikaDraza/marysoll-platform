"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
const WALL = "/images/theme-8/bg-wallpaper_1_.webp";

export function Theme8Preloader({
  logo,
  salonName,
}: {
  logo?: string;
  salonName?: string;
}) {
  const logoSrc = logo || "/images/theme-8/logo-byanja.svg";
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  // Stay until the wall + logo are loaded (min 0.6s, cap 3.5s), then start the fade.
  useEffect(() => {
    const start = Date.now();
    let settled = false;
    const begin = () => {
      if (settled) return;
      settled = true;
      const wait = Math.max(0, 600 - (Date.now() - start));
      window.setTimeout(() => setLeaving(true), wait);
    };
    let pending = 2;
    const one = () => {
      pending -= 1;
      if (pending <= 0) begin();
    };
    const w = new window.Image();
    w.onload = one;
    w.onerror = one;
    w.src = WALL;
    const l = new window.Image();
    l.onload = one;
    l.onerror = one;
    l.src = logoSrc;
    const cap = window.setTimeout(begin, 3500);
    return () => window.clearTimeout(cap);
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
      className="y2k-preloader fixed inset-0 z-[200] grid place-items-center bg-y2k-ink bg-[url('/images/theme-8/bg-wallpaper_1_.webp')] bg-cover bg-center"
    >
      {/* darken the wall so the white logo pops */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,rgba(20,2,16,0.35),rgba(20,2,16,0.72))]" />
      <Image
        src={logoSrc}
        alt={salonName ?? "The Lash Room by Anja"}
        width={420}
        height={420}
        priority
        unoptimized
        className="relative w-[180px] sm:w-[280px] h-auto [filter:brightness(0)_invert(1)] drop-shadow-[0_0_34px_rgba(255,46,151,0.55)] animate-pulse motion-reduce:animate-none"
      />
    </div>
  );
}
