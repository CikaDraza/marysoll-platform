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
 * Stylized handwritten "Queen Anja" signature with a crown.
 * Draws in sequence: Queen → Anja → crown (per the brief).
 * The lettering is an evocative graffiti script, not a typeface.
 */
export function QueenAnjaDoodle({
  size = 320,
  className,
  glow = "pink",
  stroke = "#ff2e97",
}: DoodleProps) {
  return (
    <DrawDoodle
      viewBox="0 0 380 150"
      width={size}
      className={className}
      glow={glow}
      stagger={1.1}
      delay={0.1}
    >
      {/* "Queen" */}
      <DrawStroke
        d="M22 96 C30 66 58 64 62 94 C64 108 50 114 46 100 C44 116 66 120 82 106 C94 96 88 74 80 76 C94 74 102 92 98 108 C114 99 112 76 104 76 C120 78 124 98 140 94 C152 91 152 74 144 72 C158 76 164 96 182 90"
        stroke={stroke}
        strokeWidth={7}
        duration={1.9}
      />
      {/* "Anja" */}
      <DrawStroke
        d="M206 108 C214 72 234 72 242 108 M214 94 L236 94 M254 76 C252 98 256 110 266 100 C278 90 270 74 264 78 C280 76 288 96 284 112 M300 76 C298 100 300 110 292 118 C286 124 278 118 282 110 M316 76 C316 96 316 108 326 102 C338 94 332 74 324 78 C338 76 346 96 340 114"
        stroke={stroke}
        strokeWidth={7}
        duration={1.9}
      />
      {/* crown above, drawn last */}
      <DrawStroke
        d="M150 44 L160 16 L178 34 L196 10 L214 34 L232 16 L242 44"
        stroke="#8B16C9"
        strokeWidth={7}
        duration={1.1}
      />
    </DrawDoodle>
  );
}
