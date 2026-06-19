"use client";

/**
 * FadeUp — Theme-8 scroll-reveal wrapper (replaces the prototype's [data-reveal] CSS).
 * Fades + lifts + scales children into view once, honoring reduced-motion via Framer Motion.
 * Matches the Y2K prototype: opacity 0, translateY(40px) scale(.97) → settle.
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function FadeUp({ children, delay = 0, className }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.85, ease: [0.2, 0.7, 0.2, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
