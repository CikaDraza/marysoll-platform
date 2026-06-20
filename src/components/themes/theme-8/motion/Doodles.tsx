"use client";

/**
 * Graffiti doodle components — hand-drawn outlines that "draw themselves" once
 * on viewport enter, then stay. Built on <DrawDoodle>/<DrawStroke>.
 *
 *   HeartDoodle      — outline draws, then a sparkle pops.
 *   StarDoodle       — outline draws, then a quick neon glow pulse.
 *   CrownDoodle      — zigzag crown draws + base line.
 *   QueenAnjaDoodle  — stylized handwritten signature: "Queen" → "Anja" → crown.
 *
 * Playful / girly / Bratz-Y2K — not corporate, not minimal.
 */
import { motion, useReducedMotion } from "framer-motion";
import { DrawDoodle, DrawStroke, type Glow } from "./DrawDoodle";

interface DoodleProps {
  size?: number;
  className?: string;
  glow?: Glow;
  /** stroke colour of the outline */
  stroke?: string;
}

const INK = "#0b0b0f";

/** Heart outline draws itself, then a little white sparkle pops at the top-right. */
export function HeartDoodle({
  size = 92,
  className,
  glow = "pink",
  stroke = "#ff2e97",
}: DoodleProps) {
  const reduce = useReducedMotion();
  return (
    <DrawDoodle
      viewBox="0 0 100 100"
      width={size}
      className={className}
      glow={glow}
      stagger={0.1}
    >
      {/* slightly wobbly, hand-drawn heart */}
      <DrawStroke
        d="M50 33 C42 16 19 16 17 34 C15 50 36 67 50 85 C65 67 86 51 83 34 C81 16 58 16 50 33 Z"
        stroke={stroke}
        strokeWidth={7}
        duration={1.3}
      />
      <motion.path
        d="M79 11 C81 19 85 23 93 21 C85 23 81 28 79 36 C77 28 73 23 65 21 C73 19 77 15 79 11 Z"
        fill="#fff"
        stroke={INK}
        strokeWidth={3}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        initial={reduce ? false : { scale: 0, opacity: 0, rotate: -40 }}
        whileInView={
          reduce ? undefined : { scale: [0, 1.3, 1], opacity: [0, 1, 1], rotate: 0 }
        }
        viewport={{ once: true }}
        transition={{ delay: 1.4, duration: 0.55, ease: "backOut" }}
      />
    </DrawDoodle>
  );
}

/** Star outline draws itself, then a quick glow pulse rings out. */
export function StarDoodle({
  size = 82,
  className,
  glow = "purple",
  stroke = "#8B16C9",
}: DoodleProps) {
  const reduce = useReducedMotion();
  const star = "M50 7 L60 37 L92 38 L66 58 L77 91 L50 71 L23 91 L34 58 L8 38 L40 37 Z";
  return (
    <DrawDoodle viewBox="0 0 100 100" width={size} className={className} glow={glow}>
      <DrawStroke d={star} stroke={stroke} strokeWidth={7} duration={1.2} />
      {/* one-shot glow pulse after the outline completes */}
      <motion.path
        d={star}
        fill="none"
        stroke={stroke}
        strokeWidth={10}
        strokeLinejoin="round"
        style={{ filter: "blur(2px)" }}
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        whileInView={reduce ? undefined : { opacity: [0, 0.8, 0], scale: [0.96, 1.12, 1.12] }}
        viewport={{ once: true }}
        transition={{ delay: 1.25, duration: 0.7, ease: "easeOut" }}
      />
    </DrawDoodle>
  );
}

/** Zigzag crown that draws its peaks, then the base line. */
export function CrownDoodle({
  size = 74,
  className,
  glow = "pink",
  stroke = "#ff2e97",
}: DoodleProps) {
  return (
    <DrawDoodle
      viewBox="0 0 120 90"
      width={size}
      className={className}
      glow={glow}
      stagger={0.2}
    >
      <DrawStroke
        d="M12 70 L22 26 L42 50 L60 16 L78 50 L98 26 L108 70"
        stroke={stroke}
        strokeWidth={7}
        duration={1.4}
      />
      <DrawStroke
        d="M14 78 L106 78"
        stroke={stroke}
        strokeWidth={7}
        duration={0.5}
      />
    </DrawDoodle>
  );
}

/**
 * Handwritten "Queen Anja" signature — drawn like a marker, WORD BY WORD:
 * "Queen" writes left→right, then "Anja", then the crown last (sequenced via
 * the parent's staggerChildren). Centerline single strokes (not a filled
 * outline), so each letter is traced start→end like real writing.
 *
 * Stylized graffiti script — tweak the path data to taste, or drop in a
 * centerline/single-line SVG export of your own lettering for an exact match.
 */
export function QueenAnjaDoodle({
  size = 460,
  className,
  glow = "pink",
  stroke = "#ff2e97",
}: DoodleProps) {
  return (
    <DrawDoodle
      viewBox="0 0 600 220"
      width={size}
      className={className}
      glow={glow}
      stagger={1.8}
      delay={0.15}
    >
      {/* word 1 — "Queen" (one continuous cursive stroke) */}
      <DrawStroke
        d="M60 110 C34 108 36 162 74 160 C104 158 110 116 88 104 C78 99 70 104 74 118 C80 152 92 182 126 164 C138 158 142 126 138 116 C136 150 146 178 162 168 C172 162 174 138 168 126 C168 152 178 176 196 168 C206 163 206 140 198 130 C190 122 180 128 184 140 C194 156 214 158 226 146 C232 140 232 132 230 126 C229 152 230 176 240 178"
        stroke={stroke}
        strokeWidth={8}
        duration={1.7}
      />
      {/* word 2 — "Anja" (drawn after Queen finishes) */}
      <DrawStroke
        d="M352 176 L380 96 L408 176 M362 150 L398 150 M430 176 L430 128 C430 116 456 116 458 134 L458 176 M480 128 L480 182 C480 202 466 204 458 192 M480 104 L480 106 M540 140 C522 132 514 160 530 172 C542 180 554 170 554 154 L554 128 L554 176"
        stroke={stroke}
        strokeWidth={8}
        duration={1.7}
      />
      {/* crown last, above the words */}
      <DrawStroke
        d="M237 84 L251 38 L281 68 L307 26 L333 68 L363 38 L377 84 M241 96 L373 96"
        stroke="#8B16C9"
        strokeWidth={8}
        duration={1.0}
      />
    </DrawDoodle>
  );
}
