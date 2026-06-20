"use client";

/**
 * QueenAnjaSpray — "drawn-by-hand" graffiti spray from /spray/queen-anja.svg.
 *
 * That asset is a single FILLED compound path, so we get the path-drawing effect
 * by stroking its contour (Framer `pathLength` 0 → 1 = stroke-dasharray reveal)
 * and then fading the fill in — i.e. the outline draws itself, then it "fills"
 * with neon, like a marker tracing graffiti on the wall.
 *
 * The SVG is large, so it is NOT inlined into the bundle: it's fetched at runtime
 * and only once the element scrolls near the viewport (useInView gate). The draw
 * then plays once and stays. Honors prefers-reduced-motion (static fill).
 *
 * NOTE: queen-anja.svg is ~3.3 MB (one ultra-detailed path). It previews fine on
 * desktop; for production it should be simplified/optimized (or replaced with a
 * stroke-based SVG) so the draw stays smooth on low-end mobiles.
 */
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const SRC = "/images/theme-8/spray/queen-anja.svg";

interface Props {
  className?: string;
  /** neon stroke + fill colour */
  color?: string;
  /** glow colour (defaults to `color`) */
  glowColor?: string;
  /** seconds the outline takes to draw */
  duration?: number;
}

export function QueenAnjaSpray({
  className,
  color = "#ff2e97",
  glowColor,
  duration = 3.4,
}: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "250px 0px" });
  const [svg, setSvg] = useState<{ d: string; viewBox: string } | null>(null);

  useEffect(() => {
    if (!inView) return;
    const ctrl = new AbortController();
    fetch(SRC, { signal: ctrl.signal })
      .then((r) => r.text())
      .then((txt) => {
        const viewBox = txt.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 656 624";
        const d = txt.match(/<path[^>]*\bd="([^"]+)"/)?.[1] ?? "";
        if (d) setSvg({ d, viewBox });
      })
      .catch(() => {
        /* abort / network — leave empty */
      });
    return () => ctrl.abort();
  }, [inView]);

  const glow = glowColor ?? color;

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {svg && (
        <motion.svg
          viewBox={svg.viewBox}
          className="w-full h-full overflow-visible"
          style={{
            filter: `drop-shadow(0 0 10px ${glow}aa) drop-shadow(0 0 22px ${glow}55)`,
          }}
          initial={reduce ? false : "hidden"}
          animate={reduce ? undefined : "visible"}
        >
          <motion.path
            d={svg.d}
            fill={color}
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            variants={
              reduce
                ? undefined
                : {
                    hidden: { pathLength: 0, fillOpacity: 0 },
                    visible: {
                      pathLength: 1,
                      fillOpacity: 1,
                      transition: {
                        pathLength: { duration, ease: [0.4, 0, 0.2, 1] },
                        fillOpacity: {
                          delay: duration * 0.82,
                          duration: 0.9,
                          ease: "easeOut",
                        },
                      },
                    },
                  }
            }
          />
        </motion.svg>
      )}
    </div>
  );
}
