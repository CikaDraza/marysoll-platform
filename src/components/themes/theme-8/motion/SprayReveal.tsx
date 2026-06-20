"use client";

/**
 * SprayReveal — neon-tinted graffiti spray that "sprays on" once.
 *
 * The /spray/*.svg assets are filled black silhouettes, so they can't be
 * stroke-drawn. Instead we use each SVG as a CSS mask and paint it with a neon
 * colour, then reveal it with a soft scale + fade (a spray "settling" feel) plus
 * a cheap neon drop-shadow glow.
 *
 * Animates once on viewport enter. Inside a modal it simply mounts in-view, so
 * the same `whileInView` plays on open (heart spray on booking, flower on bilten).
 * Honors prefers-reduced-motion (renders settled, no animation).
 */
import { motion, useReducedMotion } from "framer-motion";

const COLORS = {
  pink: "#ff2e97",
  hot: "#ff5fd2",
  purple: "#8B16C9",
  red: "#ff2d55",
  white: "#ffffff",
} as const;

export type SprayColor = keyof typeof COLORS;

interface SprayRevealProps {
  /** e.g. "/images/theme-8/spray/heart-spray-1.svg" */
  src: string;
  color?: SprayColor;
  /** box size in px (square; SVG is contained + centered) */
  size?: number;
  className?: string;
  glow?: boolean;
  delay?: number;
  opacity?: number;
}

export function SprayReveal({
  src,
  color = "pink",
  size = 220,
  className,
  glow = true,
  delay = 0,
  opacity = 0.92,
}: SprayRevealProps) {
  const reduce = useReducedMotion();
  const c = COLORS[color];
  return (
    <motion.div
      aria-hidden="true"
      className={className}
      style={{
        width: size,
        height: size,
        backgroundColor: c,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        filter: glow ? `drop-shadow(0 0 8px ${c}aa)` : undefined,
      }}
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      whileInView={reduce ? undefined : { opacity, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay }}
    />
  );
}
