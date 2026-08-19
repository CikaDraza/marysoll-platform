/**
 * theme-9/primitives — DS atomi prototipa, portovani lokalno.
 *
 * Prototip je crtan na Psihointegritet design systemu. Ovde su prepisani nad
 * theme-9 tokenima (`--color-ee-*`), bez ikakve nove zavisnosti i bez uticaja
 * na ostale teme. Vrednosti su identične onima iz `expert-editorial-theme.js`.
 */
import type { ReactNode } from "react";

type EyebrowTone = "sage" | "meadow" | "coffee";

const EYEBROW_TONE: Record<EyebrowTone, string> = {
  sage: "text-ee-sage",
  meadow: "text-ee-accent-contrast",
  coffee: "text-ee-text",
};

export function Eyebrow({
  children,
  tone = "sage",
  className = "",
}: {
  children: ReactNode;
  tone?: EyebrowTone;
  className?: string;
}) {
  return (
    <span
      className={`font-instrument-sans text-[12.5px] font-semibold tracking-[0.16em] uppercase ${EYEBROW_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

type ChipVariant = "tag" | "tagOutlined" | "label" | "labelWarm";

const CHIP_VARIANT: Record<ChipVariant, string> = {
  tag: "bg-ee-surface-muted text-ee-text",
  tagOutlined: "border border-ee-border text-ee-text-muted",
  label: "bg-ee-surface-muted text-ee-accent",
  labelWarm: "bg-ee-terracotta/25 text-ee-text",
};

export function Chip({
  children,
  variant = "tag",
  className = "",
}: {
  children: ReactNode;
  variant?: ChipVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12.5px] leading-none ${CHIP_VARIANT[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Strelica u krugu; rotira se iz −45° u 0° na hover roditelja (`group`). */
export function ArrowCircle({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="bg-ee-accent-soft text-ee-canvas relative inline-flex -rotate-45 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-0"
      style={{ width: size, height: size }}
    >
      →
    </span>
  );
}
