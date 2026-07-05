"use client";
/** ScoreBadge — pomoćna komponenta Marketing taba (superadmin CMS). */

// ─── SEO Score Badge ──────────────────────────────────────────────────────────

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-emerald-900/60 text-emerald-400 border-emerald-700"
      : score >= 50
        ? "bg-amber-900/60 text-amber-400 border-amber-700"
        : "bg-red-900/60 text-red-400 border-red-700";
  return (
    <span
      className={`text-sm font-bold px-3 py-1 rounded-full border ${color}`}
    >
      SEO {score}/100
    </span>
  );
}

