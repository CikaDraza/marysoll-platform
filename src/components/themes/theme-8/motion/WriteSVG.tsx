"use client";

/**
 * WriteSVG — "writes" a multi-path SVG word by word, letter by letter.
 *
 * Works with the /spray/draw-queen-anja.svg export: each letter is its own
 * <path> (filled). We don't trust document order (the export isn't in writing
 * order), so we:
 *   1. read every <path> + its start point,
 *   2. cluster them into rows by Y (e.g. "Queen" row, "Anja" row, crown row),
 *   3. order rows top→bottom and each row left→right,
 *   4. optionally draw the top decoration row (crown) LAST.
 *
 * Each letter then animates: outline strokes itself (Framer `pathLength`, a
 * bold neon "spray" line) and the fill sprays in right after — sequenced with a
 * per-letter stagger and an extra beat between words.
 *
 * The file is fetched lazily (only when scrolled near) so it never sits in the
 * JS bundle. Honors prefers-reduced-motion (renders filled, no animation).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface ParsedPath {
  d: string;
  hasFill: boolean;
  x: number;
  y: number;
  group: number; // 0 = first word, 1 = next word, …
}

function parse(svg: string): { viewBox: string; paths: Omit<ParsedPath, "group">[] } {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 100 100";
  const tags = svg.match(/<path\b[^>]*>/g) ?? [];
  const paths: Omit<ParsedPath, "group">[] = [];
  for (const t of tags) {
    const d = t.match(/\sd="([^"]+)"/)?.[1];
    if (!d) continue;
    const fill = t.match(/fill="([^"]*)"/)?.[1];
    const m = d.match(/[Mm]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/);
    paths.push({
      d,
      hasFill: !!fill && fill !== "none",
      x: m ? +m[1] : 0,
      y: m ? +m[2] : 0,
    });
  }
  return { viewBox, paths };
}

/** Cluster into rows by Y, order top→bottom + left→right, crown row last. */
function orderForWriting(
  paths: Omit<ParsedPath, "group">[],
  rowGap: number,
  topRowLast: boolean,
): ParsedPath[] {
  if (!paths.length) return [];
  const byY = [...paths].sort((a, b) => a.y - b.y);
  const rows: Omit<ParsedPath, "group">[][] = [];
  let cur: Omit<ParsedPath, "group">[] = [];
  let lastY = -Infinity;
  for (const p of byY) {
    if (cur.length && p.y - lastY > rowGap) {
      rows.push(cur);
      cur = [];
    }
    cur.push(p);
    lastY = p.y;
  }
  if (cur.length) rows.push(cur);
  rows.forEach((r) => r.sort((a, b) => a.x - b.x));
  if (topRowLast && rows.length > 2) rows.push(rows.shift()!);
  return rows.flatMap((r, gi) => r.map((p) => ({ ...p, group: gi })));
}

interface Props {
  src: string;
  color?: string;
  glowColor?: string;
  /** bolder = thicker spray line while drawing */
  strokeWidth?: number;
  className?: string;
  letterDuration?: number;
  letterStagger?: number;
  /** extra pause between words (s) */
  wordGap?: number;
  /** Y distance that starts a new row */
  rowGap?: number;
  /** draw the topmost row (crown) last */
  topRowLast?: boolean;
}

export function WriteSVG({
  src,
  color = "#ff2e97",
  glowColor,
  strokeWidth = 12,
  className,
  letterDuration = 0.55,
  letterStagger = 0.26,
  wordGap = 0.5,
  rowGap = 90,
  topRowLast = true,
}: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "250px 0px" });
  const [raw, setRaw] = useState<string | null>(null);

  useEffect(() => {
    if (!inView) return;
    const ctrl = new AbortController();
    fetch(src, { signal: ctrl.signal })
      .then((r) => r.text())
      .then(setRaw)
      .catch(() => {
        /* aborted / network */
      });
    return () => ctrl.abort();
  }, [inView, src]);

  const parsed = useMemo(() => (raw ? parse(raw) : null), [raw]);
  const ordered = useMemo(
    () => (parsed ? orderForWriting(parsed.paths, rowGap, topRowLast) : []),
    [parsed, rowGap, topRowLast],
  );

  const glow = glowColor ?? color;

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {parsed && (
        <svg
          viewBox={parsed.viewBox}
          className="w-full h-full overflow-visible"
          style={{
            filter: `drop-shadow(0 0 6px ${glow}) drop-shadow(0 0 18px ${glow}aa)`,
          }}
        >
          {ordered.map((p, i) => {
            if (reduce) {
              return (
                <path
                  key={i}
                  d={p.d}
                  fill={p.hasFill ? color : "none"}
                  stroke={color}
                  strokeWidth={p.hasFill ? 0 : strokeWidth}
                />
              );
            }
            const delay = i * letterStagger + p.group * wordGap;
            return (
              <motion.path
                key={i}
                d={p.d}
                fill={color}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: p.hasFill ? 1 : 0 }}
                transition={{
                  pathLength: { duration: letterDuration, delay, ease: [0.4, 0, 0.2, 1] },
                  fillOpacity: { duration: 0.3, delay: delay + letterDuration * 0.6 },
                }}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
