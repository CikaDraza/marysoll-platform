"use client";

/**
 * DrawDoodle / DrawStroke — graffiti "drawn-by-hand" SVG primitive.
 *
 * Uses Framer Motion's `pathLength` (which drives stroke-dasharray / stroke-dashoffset
 * under the hood) to animate each stroke from 0 → 1 as if a marker is drawing it.
 *
 * - Triggers once on viewport enter (`whileInView` + `viewport.once`).
 * - Stays drawn afterwards (no reverse, no loop).
 * - Sequential drawing via the parent's `staggerChildren` (e.g. Queen → Anja → crown).
 * - Per-stroke `duration`/`ease` lets long lines run faster and corners feel slower.
 * - Subtle neon glow (pink / purple / red) via a cheap CSS drop-shadow — no blur layers.
 * - Honors prefers-reduced-motion: strokes render fully drawn, instantly.
 *
 * Mobile-friendly: pure SVG + transforms, no canvas / particles / lottie.
 */
import { motion, useReducedMotion, type Transition } from "framer-motion";
import type { ReactNode } from "react";

const GLOW: Record<string, string> = {
  pink: "drop-shadow-[0_0_5px_#ff2e97]",
  purple: "drop-shadow-[0_0_5px_#8B16C9]",
  red: "drop-shadow-[0_0_5px_#ff2d55]",
  none: "",
};

export type Glow = keyof typeof GLOW;

interface DrawDoodleProps {
  viewBox: string;
  width?: number;
  height?: number;
  className?: string;
  glow?: Glow;
  /** delay before the first stroke starts (s) */
  delay?: number;
  /** gap between sibling strokes for sequential drawing (s) */
  stagger?: number;
  children: ReactNode;
}

/** SVG wrapper that orchestrates its child <DrawStroke> elements once in view. */
export function DrawDoodle({
  viewBox,
  width,
  height,
  className,
  glow = "pink",
  delay = 0,
  stagger = 0.5,
  children,
}: DrawDoodleProps) {
  return (
    <motion.svg
      viewBox={viewBox}
      width={width}
      height={height}
      aria-hidden="true"
      className={`${GLOW[glow]} ${className ?? ""}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.svg>
  );
}

interface StrokeProps {
  d: string;
  stroke?: string;
  strokeWidth?: number;
  /** seconds — long lines can run faster, corner-heavy strokes slower */
  duration?: number;
  ease?: Transition["ease"];
}

/** A single hand-drawn stroke; pathLength animates 0 → 1. */
export function DrawStroke({
  d,
  stroke = "#0b0b0f",
  strokeWidth = 7,
  duration = 1.1,
  ease = [0.4, 0, 0.25, 1],
}: StrokeProps) {
  const reduce = useReducedMotion();
  const common = {
    d,
    fill: "none",
    stroke,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (reduce) return <path {...common} />;
  return (
    <motion.path
      {...common}
      variants={{
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
          pathLength: 1,
          opacity: 1,
          transition: {
            pathLength: { duration, ease },
            opacity: { duration: 0.001 },
          },
        },
      }}
    />
  );
}
