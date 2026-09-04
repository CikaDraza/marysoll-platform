"use client";
/**
 * Deljeni helperi/konstante dashboard tabova — izdvojeno iz
 * app/dashboard/page.tsx (Faza 4c) da tab komponente ne importuju stranicu.
 */
import type { IService } from "@/types";
import { minServicePrice, isPriceFrom } from "@/helpers/servicePrice";
import { PRICE_ON_REQUEST_LABEL } from "@/helpers/formatPrice";
import type { LandingTheme } from "@/types";
import { availableThemesForTenant } from "@/lib/platform/theme-access";

export const SR_DAY_SHORT = ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"];
export const MANUAL_DAYS_AHEAD = 14;

/** Sledećih `n` lokalnih datuma kao "YYYY-MM-DD" (počev od danas). */
export function upcomingDateKeys(n: number): string[] {
  const out: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
    );
  }
  return out;
}

/** "2026-06-30" → "Uto, 30.06." */
export function formatManualDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${SR_DAY_SHORT[dt.getDay()]}, ${String(d).padStart(2, "0")}.${String(
    m,
  ).padStart(2, "0")}.`;
}

/** Broj dana od danas do datuma "YYYY-MM-DD" (danas = 0, juče = -1). */
export function dayOffsetFromToday(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}

// ─── Themes ───────────────────────────────────────────────────────────────────

const THEMES: {
  id: LandingTheme;
  label: string;
  description: string;
  previewColors: string[];
}[] = [
  {
    id: "theme-1",
    label: "Makeup Theme",
    description: "Čist, elegantan dizajn u beloj i sivoj sa crnim akcentima",
    previewColors: ["#ffffff", "#e5e7eb", "#111111"],
  },
  {
    id: "theme-2",
    label: "Dark Luxury",
    description: "Tamni, luksuzni dizajn sa zlatnim akcentima",
    previewColors: ["#111827", "#eab308", "#374151"],
  },
  {
    id: "theme-3",
    label: "Soft Minimal",
    description: "Nežni, minimalistički dizajn u toplim tonovima",
    previewColors: ["#C9A990", "#FAF8F5", "#EDE5DC"],
  },
  {
    id: "theme-4",
    label: "Editorial Luxury",
    description:
      "Elegantni dizajn sa jakim kontrastom i sofisticiranim fontovima",
    previewColors: ["#4C2D4A", "#2C1E29", "#E8D4AD"],
  },
  {
    id: "theme-5",
    label: "Makeup Luxury",
    description: "Elegantni dizajn sa blog postom",
    previewColors: ["#FFFFFF", "#F3F3F3", "#DCAB28"],
  },
  {
    id: "theme-6",
    label: "Nail Art Elegance",
    description: "Svetli, editorijalni dizajn za nail studio",
    previewColors: ["#FFFFFF", "#FAF8F5", "#C4A595"],
  },
  {
    id: "theme-7",
    label: "Lash Studio",
    description: "Neon editorijalni dizajn za lash & brow studio",
    previewColors: ["#0b0a0c", "#ff2e88", "#f6f1ec"],
  },
  {
    id: "theme-8",
    label: "Y2K Lash",
    description: "Razigrani Y2K dizajn sa grafitima za lash & brow studio",
    previewColors: ["#2a0d22", "#ff2e97", "#8B16C9"],
  },
  {
    id: "theme-9",
    label: "Expert Editorial",
    description:
      "Editorijalni dizajn za stručnu edukaciju i konsultacije o nezi kože",
    previewColors: ["#faf8f3", "#2e3b2e", "#c6d5a8"],
  },
];

/** Theme picker projection. Server policy remains the authorization source. */
export function themePickerThemesForTenant(
  tenantSlug?: string | null,
): typeof THEMES {
  const availableThemes = new Set(availableThemesForTenant(tenantSlug));
  return THEMES.filter((theme) => availableThemes.has(theme.id));
}

// ─── Style tokens ─────────────────────────────────────────────────────────────

export const inp = [
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

export const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";
export const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

export interface SeoAnalysisResult {
  score: number;
  issues: string[];
  suggestions: string[];
  keywords: string[];
  snapshotSource?: "cms" | "rendered-dom";
  crawlUrl?: string;
  crawlError?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cena u admin listi usluga. Prati ISTU centralnu semantiku kao javni cenovnik
 * i BookingWidget — ranije je ovde stajalo `variants[0].price`, dakle PRVA
 * varijanta a ne najniža, i bez provere „na upit“, pa je admin umeo da pokaže
 * drugi broj nego Marijin sajt.
 */
export function servicePrice(s: IService): string {
  const min = minServicePrice(s);
  if (min == null) return PRICE_ON_REQUEST_LABEL;
  const amount = `${min.toLocaleString("sr-RS")} RSD`;
  return isPriceFrom(s) ? `od ${amount}` : amount;
}

export function SeoBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
      : score >= 50
        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${color}`}
    >
      SEO Score: {score}/100
    </span>
  );
}

export const TYPE_BADGE: Record<string, string> = {
  single: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  variant:
    "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  group: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
};
