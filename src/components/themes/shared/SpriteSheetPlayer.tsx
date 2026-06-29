"use client";

/**
 * SpriteSheetPlayer
 * --------------------------------------------------------------------------
 * JS-vođen sprite-sheet plejer sa GRID rasporedom. Bez biblioteka.
 *
 * Za razliku od CSS `steps()` (koji igra sve frejmove jednako brzo), ovde svaki
 * frejm može imati SVOJE trajanje preko `frameDurations` (ms) — npr. duži hold
 * na namigu, sporiji deo sa poljupcem/srcima. Ako `frameDurations` nije zadat,
 * koristi uniformni tajming iz `fps`.
 *
 * Frejmovi idu red-major: 0..(columns-1) prvi red, pa sledeći red.
 *
 * (Importovano/prošireno iz claude.ai/design projekta "Sprite sheet animation
 * za Hvala moment".)
 */
import React, { useEffect, useMemo, useRef, useState } from "react";

export interface SpriteSheetPlayerProps {
  /** URL sprite sheet-a. */
  src: string;
  /** Dimenzije JEDNOG frejma u px (kod nas: 180 x 350). */
  frameWidth: number;
  frameHeight: number;
  /** Raspored grida. */
  columns: number;
  rows: number;
  /** Ukupan broj frejmova. Default: columns*rows (pun grid). */
  frames?: number;
  /** Uniformni tajming kad nema frameDurations. */
  fps?: number;
  /** Trajanje SVAKOG frejma u ms (override fps). Kraći/duži niz se dopuni/iseče. */
  frameDurations?: number[];
  /** Da li se vrti u krug (default true). loop=false → odigra jednom i drži poslednji frejm. */
  loop?: boolean;
  /** Skaliranje prikaza (1 = native). */
  scale?: number;
  /** Poziva se kada završi (samo kad loop=false). */
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function SpriteSheetPlayer({
  src,
  frameWidth,
  frameHeight,
  columns,
  rows,
  frames,
  fps = 12,
  frameDurations,
  loop = true,
  scale = 1,
  onComplete,
  className,
  style,
}: SpriteSheetPlayerProps) {
  const total = frames ?? columns * rows;

  // Niz trajanja po frejmu (uvek dužine `total`).
  const durations = useMemo(
    () =>
      Array.from({ length: total }, (_, i) =>
        frameDurations && frameDurations[i] != null
          ? frameDurations[i]
          : 1000 / fps,
      ),
    [frameDurations, total, fps],
  );

  const [frame, setFrame] = useState(0);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Lanac setTimeout-a — svaki frejm čeka svoje trajanje, pa prelazi na sledeći.
  useEffect(() => {
    let cur = 0;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        const next = cur + 1;
        if (next >= total) {
          if (loop) {
            cur = 0;
            setFrame(0);
            schedule();
          } else {
            onCompleteRef.current?.(); // ostaje na poslednjem frejmu
          }
        } else {
          cur = next;
          setFrame(next);
          schedule();
        }
      }, durations[cur]);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [durations, total, loop, src]);

  const sheetW = columns * frameWidth;
  const sheetH = rows * frameHeight;
  const col = frame % columns;
  const row = Math.floor(frame / columns);

  return (
    <div
      className={className}
      style={{
        width: frameWidth,
        height: frameHeight,
        backgroundImage: `url("${src}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${sheetW}px ${sheetH}px`,
        backgroundPosition: `-${col * frameWidth}px -${row * frameHeight}px`,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "bottom center",
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
