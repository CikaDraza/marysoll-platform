"use client";

/**
 * FadeUp — Theme-8 scroll-reveal wrapper (replaces the prototype's [data-reveal] CSS).
 * Fades + lifts + scales children into view once, honoring reduced-motion via Framer Motion.
 * Matches the Y2K prototype: opacity 0, translateY(40px) scale(.97) → settle.
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useThemeReduce } from "./motion/reduceMotion";

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function FadeUp({ children, delay = 0, className }: Props) {
  // Kad je reduced-motion (uklj. iOS "safe" render preko MotionConfig-a):
  // initial={false} → SSR renderuje sadržaj VIDLJIV (bez whileInView reveal-a),
  // pa sekcije rade i ako se klijentski JS nikad ne izvrši. Inače, ta 22 mesta
  // bi ostala na opacity:0 dok ih scroll ne otkrije — nevidljivo ako JS padne.
  const reduce = useThemeReduce();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 40, scale: 0.97 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.85, ease: [0.2, 0.7, 0.2, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
