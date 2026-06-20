"use client";

/**
 * IntroFade — opacity-only reveal used for the first-load "layer by layer"
 * intro. Opacity (not transform) so it never breaks `fixed`/`sticky`/`absolute`
 * children. Plays once on mount; honors prefers-reduced-motion (shows instantly).
 */
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function IntroFade({ children, className, delay = 0, duration = 0.6 }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0 }}
      animate={reduce ? undefined : { opacity: 1 }}
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
