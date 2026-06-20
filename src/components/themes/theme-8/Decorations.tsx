"use client";

/**
 * Theme-8 decorative bits — Y2K stickers (stars / sparkle / heart) that bob, wiggle
 * and twinkle, plus the torn-paper SVG filter defs used across the theme.
 *
 * Reimplements the prototype's CSS keyframes (lrbob / lrwiggle / lrtwinkle) with
 * Framer Motion loops; respects prefers-reduced-motion automatically via Framer Motion
 * (looping `animate` is paused when the user opts out).
 */
import { motion, useReducedMotion } from "framer-motion";

const STAR =
  "M50 4 L61 38 L97 38 L68 60 L79 95 L50 73 L21 95 L32 60 L3 38 L39 38 Z";
const SPARKLE =
  "M50 2 C54 32 68 46 98 50 C68 54 54 68 50 98 C46 68 32 54 2 50 C32 46 46 32 50 2 Z";
const HEART =
  "M50 88 C18 64 6 44 6 28 C6 14 17 6 29 6 C38 6 46 11 50 20 C54 11 62 6 71 6 C83 6 94 14 94 28 C94 44 82 64 50 88 Z";

type Shape = "star" | "sparkle" | "heart";
const PATHS: Record<Shape, string> = { star: STAR, sparkle: SPARKLE, heart: HEART };

interface DecoProps {
  shape: Shape;
  size?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** "bob" | "wiggle" | "twinkle" | "bounce" | "pulse" | "none" */
  motionType?: "bob" | "wiggle" | "twinkle" | "bounce" | "pulse" | "none";
  className?: string;
  style?: React.CSSProperties;
}

const LOOPS = {
  bob: { animate: { y: [0, -16, 0] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const } },
  wiggle: { animate: { rotate: [-6, 6, -6] }, transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" as const } },
  twinkle: { animate: { opacity: [0.35, 1, 0.35], scale: [0.8, 1.15, 0.8] }, transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" as const } },
  // springy hop — a little more energetic than `bob`
  bounce: { animate: { y: [0, -24, 0] }, transition: { duration: 1.8, repeat: Infinity, times: [0, 0.4, 1], ease: "easeInOut" as const } },
  // heartbeat-style scale pulse
  pulse: { animate: { scale: [1, 1.18, 1] }, transition: { duration: 1.7, repeat: Infinity, ease: "easeInOut" as const } },
};

/** A single floating Y2K sticker (decorative — aria-hidden). */
export function Deco({
  shape,
  size = 56,
  fill = "#fff",
  stroke = "#0b0b0f",
  strokeWidth = 5,
  motionType = "none",
  className,
  style,
}: DecoProps) {
  const reduce = useReducedMotion();
  const loop = motionType !== "none" && !reduce ? LOOPS[motionType] : undefined;
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={style}
      animate={loop?.animate}
      transition={loop?.transition}
    >
      <path d={PATHS[shape]} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </motion.svg>
  );
}

/**
 * Torn-paper displacement filters, mounted once at the theme root.
 * Panels reference them via `[filter:url(#y2k-torn)]` / `[filter:url(#y2k-torn2)]`.
 */
export function Y2KFilters() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <filter id="y2k-torn">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.014 0.016"
            numOctaves={2}
            seed={9}
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale={16}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter id="y2k-torn2">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.018"
            numOctaves={2}
            seed={3}
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale={13}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
