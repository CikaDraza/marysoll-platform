"use client";
/**
 * theme-9/Reveal — jedini motion pattern teme (spec: reveal-fade-up).
 *
 * opacity 0→1, y 28→0, 700ms, cubic-bezier(.22,1,.36,1), jednom, amount 0.08.
 *
 * DVE NAMERNE ODLUKE:
 *
 * 1. Bez framer-motion-a i bez React state-a. SSR HTML je VIDLJIV; skrivanje se
 *    dešava tek u efektu, direktno na DOM čvoru. Ako se klijentski JS nikad ne
 *    izvrši (videli smo to na iOS-u u theme-8), strana i dalje stoji.
 *
 * 2. Stil se menja imperativno, ne kroz `setState` — po ARCHITECTURAL_RULES §4.4
 *    („nikad setState direktno u useEffect"). Ovo je čisto vizuelni efekat nad
 *    jednim čvorom, pa mu React re-render i ne treba.
 */
import { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Kašnjenje u ms — za stepenasto pojavljivanje stavki u mreži. */
  delay?: number;
}

const EASE = "cubic-bezier(.22,1,.36,1)";

/** Uvek `div` — semantički element (section/article/li) drži pozivalac. */
export function Reveal({ children, className, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(28px)";
    el.style.transition = `opacity 700ms ${EASE} ${delay}ms, transform 700ms ${EASE} ${delay}ms`;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
