"use client";
/** SeoToolbar — SEO metadata + AI analiza za landing (Marketing tab).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { ScoreBadge } from "../ScoreBadge";
import { SeoResultPanel } from "../SeoResultPanel";
import { TypoFixPanel } from "../TypoFixPanel";
import { SingleImageField } from "@/components/admin/campaign/SingleImageField";
import type { PerformanceSeoSnapshot } from "@/types/marketing-landing";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
  superAdminPrimaryButtonClass as btnPrimary,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

const PERFORMANCE_FIELDS: {
  key: keyof PerformanceSeoSnapshot;
  label: string;
  suffix: string;
  placeholder: string;
}[] = [
  {
    key: "realExperienceScore",
    label: "Real Experience Score",
    suffix: "",
    placeholder: "96",
  },
  {
    key: "firstContentfulPaint",
    label: "First Contentful Paint",
    suffix: "sec",
    placeholder: "1.78",
  },
  {
    key: "largestContentfulPaint",
    label: "Largest Contentful Paint",
    suffix: "sec",
    placeholder: "2.73",
  },
  {
    key: "interactionToNextPaint",
    label: "Interaction to Next Paint",
    suffix: "ms",
    placeholder: "40",
  },
  {
    key: "cumulativeLayoutShift",
    label: "Cumulative Layout Shift",
    suffix: "",
    placeholder: "0.01",
  },
  {
    key: "firstInputDelay",
    label: "First Input Delay",
    suffix: "ms",
    placeholder: "4",
  },
  {
    key: "timeToFirstByte",
    label: "Time to First Byte",
    suffix: "sec",
    placeholder: "0.09",
  },
];

export function SeoToolbar() {
  const {
    landing: ls,
    isSaving,
    update,
    save,
    seoResult,
    seoLoading,
    autoFixLoading,
    typoFixLoading,
    typoResult,
    runSeoAnalysis,
    runAutoFix,
    runTypoFix,
    performance,
    setPerformance,
  } = useMarketingContext();

  return (
    <>
<div className={card}>
  <div className="flex flex-col gap-4">
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs text-slate-400 font-bold uppercase">
            SEO Metadata i AI analiza
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Analiza koristi renderovani snapshot landing stranice,
            metadata i CTA tok.
          </p>
          {seoResult?.snapshotSource && (
            <p className="text-[11px] text-slate-500 mt-1">
              Snapshot:{" "}
              <span className="text-violet-300">
                {seoResult.snapshotSource === "rendered-dom"
                  ? "renderovani DOM"
                  : "CMS fallback"}
              </span>
            </p>
          )}
        </div>
        {seoResult && <ScoreBadge score={seoResult.score} />}
      </div>
      <div>
        <label className={lbl}>Home Title</label>
        <input
          className={inp}
          value={ls.seo.homeTitle}
          onChange={(e) =>
            update("seo", { ...ls.seo, homeTitle: e.target.value })
          }
        />
        <p className="text-[10px] text-slate-500 mt-1">
          {ls.seo.homeTitle.length}/60
        </p>
      </div>
      <div>
        <label className={lbl}>Home Description</label>
        <textarea
          className={inp}
          rows={3}
          value={ls.seo.homeDescription}
          onChange={(e) =>
            update("seo", {
              ...ls.seo,
              homeDescription: e.target.value,
            })
          }
        />
        <p className="text-[10px] text-slate-500 mt-1">
          {ls.seo.homeDescription.length}/160
        </p>
      </div>
      <div>
        <label className={lbl}>OG image</label>
        <SingleImageField
          value={ls.seo.ogImage ?? ""}
          onChange={(url) =>
            update("seo", { ...ls.seo, ogImage: url })
          }
        />
      </div>
    </div>

    <div className="order-first">
      <h2 className="text-xs text-slate-400 font-bold uppercase mb-3">
        {"Performanse opcionalno (Speed Insights)"}
      </h2>
      <div className="grid sm:grid-cols-2 gap-2">
        {PERFORMANCE_FIELDS.map((field) => (
          <div key={field.key} className="min-w-0">
            <label className={lbl}>
              {field.label}{" "}
              {field.suffix && (
                <span className="w-8 text-xs lowercase text-indigo-500">
                  u {field.suffix}
                </span>
              )}
            </label>
            <div className="flex items-center gap-1">
              <input
                className={inp}
                type="number"
                step="0.01"
                placeholder={field.placeholder}
                value={performance[field.key] ?? ""}
                onChange={(e) =>
                  setPerformance((prev) => ({
                    ...prev,
                    [field.key]:
                      e.target.value === ""
                        ? null
                        : Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>

  <div className="mt-4 flex flex-col gap-2">
    <button
      className={btnPrimary}
      disabled={seoLoading}
      onClick={() => runSeoAnalysis(performance)}
    >
      {seoLoading ? "Analiziranje..." : "Pokreni AI SEO analizu"}
    </button>
    {seoResult && (
      <button
        className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition disabled:opacity-40"
        disabled={autoFixLoading}
        onClick={() => runAutoFix(performance)}
      >
        {autoFixLoading ? "Popravljanje..." : "✦ Auto-fix sadržaj"}
      </button>
    )}
    <button
      className="px-4 py-2 bg-sky-700 text-white text-xs font-bold rounded-lg hover:bg-sky-600 transition disabled:opacity-40"
      disabled={typoFixLoading}
      onClick={() => runTypoFix()}
      title="Ispravlja samo pravopisne/typo greške, bez SEO prepravke"
    >
      {typoFixLoading ? "Ispravljanje..." : "✓ Ispravi typo greške"}
    </button>
    <button
      className="px-4 py-2 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600 transition disabled:opacity-40"
      disabled={isSaving}
      onClick={() => save()}
    >
      {isSaving ? "Čuvanje..." : "Sačuvaj SEO"}
    </button>
  </div>
  {/* Typo-fix rezultat — iznad SEO analize */}
  <TypoFixPanel result={typoResult} />

  <SeoResultPanel seoResult={seoResult} />
</div>
    </>
  );
}
