"use client";

import { useRef } from "react";
import type { ContentFocalPoint } from "@/lib/content/schemas/landing-blocks";

/**
 * Biranje tačke kadra klikom po slici.
 *
 * Isti hero se na mobilnom seče kao 4/5 a na desktopu kao 3/1 — bez ovoga
 * jedan od ta dva kadra uvek ispadne loše. Zato se ne bira veličina slike nego
 * ono što mora da ostane u kadru.
 */
export function FocalPointPicker({
  src,
  alt,
  focalPoint,
  aspectHint,
  onChange,
}: {
  src: string;
  alt: string;
  focalPoint?: ContentFocalPoint;
  aspectHint?: string;
  onChange: (focalPoint?: ContentFocalPoint) => void;
}) {
  const frameRef = useRef<HTMLButtonElement>(null);
  const point = focalPoint ?? { x: 0.5, y: 0.5 };

  const pick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const frame = frameRef.current?.getBoundingClientRect();
    if (!frame) return;

    onChange({
      x: Math.min(1, Math.max(0, (event.clientX - frame.left) / frame.width)),
      y: Math.min(1, Math.max(0, (event.clientY - frame.top) / frame.height)),
    });
  };

  return (
    <div className="space-y-1">
      <button
        ref={frameRef}
        type="button"
        onClick={pick}
        className="relative block w-full cursor-crosshair overflow-hidden rounded-md"
        aria-label="Izaberite tačku koja mora ostati u kadru"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-96 w-full object-cover" style={{ objectPosition: `${point.x * 100}% ${point.y * 100}%` }} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.35)]"
          style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
        />
      </button>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-500">
          Kliknite na deo slike koji mora ostati u kadru
          {aspectHint ? ` · ${aspectHint}` : ""}
        </p>
        {focalPoint && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-[11px] font-semibold text-gray-500 underline-offset-2 hover:underline"
          >
            Centriraj
          </button>
        )}
      </div>
    </div>
  );
}
