"use client";
/** TypoFixPanel — pomoćna komponenta Marketing taba (superadmin CMS). */
import type { TypoFixState } from "@/hooks/useMarketingCms";
import {
  superAdminCardClass as card,
} from "@/components/superadmin/shared";

// ─── Typo-fix result panel ────────────────────────────────────────────────────

export function TypoFixPanel({ result }: { result: TypoFixState | null }) {
  if (!result) return null;

  if (result.status === "error") {
    return (
      <div className={`${card} border border-red-800/60`}>
        <p className="text-[11px] font-bold text-red-400 uppercase tracking-wide mb-1">
          Typo provera
        </p>
        <p className="text-sm text-red-300">
          Nije ništa ispravljeno zbog sistemske greške — pokušaj ponovo.
        </p>
      </div>
    );
  }

  if (result.status === "clean") {
    return (
      <div className={`${card} border border-emerald-800/50`}>
        <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide mb-1">
          Typo provera
        </p>
        <p className="text-sm text-emerald-300">
          ✓ Sve je čisto — nije pronađena nijedna typo greška.
        </p>
      </div>
    );
  }

  return (
    <div className={card + " my-4"}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
          Ispravljene typo greške
          <span className="ml-2 text-violet-400">
            {result.corrections.length}
          </span>
        </p>
        <span className="text-[10px] text-slate-500">
          Proveri i sačuvaj da primeniš
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {result.corrections.map((c, i) => (
          <span
            key={`${c.before}-${c.after}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-700/60 px-2 py-1 text-xs"
          >
            {c.before && (
              <span className="text-slate-400 line-through">{c.before}</span>
            )}
            {c.before && <span className="text-slate-500">→</span>}
            <span className="font-semibold text-emerald-300">{c.after}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
