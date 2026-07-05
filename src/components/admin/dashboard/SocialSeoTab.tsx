"use client";
/**
 * SocialSeoTab — izdvojen iz app/dashboard/page.tsx (Faza 4c).
 * Sav state/handleri žive u AdminDashboard i stižu kroz DashboardTabProps.
 */
import { SeoBadge, card, inp, lbl } from "./shared";
import type { DashboardTabProps } from "./types";



export function SocialSeoTab(props: DashboardTabProps) {
  const {
    handleMetadataSeoAutoFix,
    handleSaveMetadataSeo,
    isAnalyzingMetadataSeo,
    isAutoFixingMetadataSeo,
    metadataSeoResult,
    runMetadataSeoAnalysis,
    showMetadataSeoPanel,
    sp,
  } = props;

  return (
  <div className="space-y-6">
    <div className={card}>
      <h2 className="font-bold text-gray-900 dark:text-white mb-5">
        Društvene mreže
      </h2>
      <div className="space-y-3">
        {(["instagram", "facebook", "tiktok"] as const).map((net) => (
          <div key={net} className="flex items-center gap-4">
            <span className="w-24 text-sm font-semibold text-gray-600 dark:text-gray-400 capitalize">
              {net}
            </span>
            <input
              className={inp}
              value={sp.form.social[net] ?? ""}
              onChange={(e) => sp.setSocialField(net, e.target.value)}
              placeholder={`https://${net}.com/vašsalon`}
            />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button
          onClick={() => sp.save()}
          disabled={sp.isSaving}
          className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
        >
          {sp.isSaving ? "Snimanje..." : "Sačuvaj"}
        </button>
      </div>
    </div>
    <div className={card}>
      <h2 className="font-bold text-gray-900 dark:text-white mb-1">
        SEO Metadata
      </h2>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
        Title i description koji se prikazuju u Google pretrazi.
      </p>
      {showMetadataSeoPanel && (
        <div className="mb-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-gray-900 dark:text-white">
                SEO Analiza
              </h3>
              {metadataSeoResult && (
                <SeoBadge score={metadataSeoResult.score} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runMetadataSeoAnalysis}
                disabled={isAnalyzingMetadataSeo}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
              >
                {isAnalyzingMetadataSeo ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                    Analiziram...
                  </>
                ) : (
                  "Pokreni SEO analizu"
                )}
              </button>
              {metadataSeoResult && (
                <button
                  type="button"
                  onClick={handleMetadataSeoAutoFix}
                  disabled={isAutoFixingMetadataSeo}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50"
                >
                  {isAutoFixingMetadataSeo ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                      Popravljam...
                    </>
                  ) : (
                    "✦ Auto-fix metadata"
                  )}
                </button>
              )}
            </div>
          </div>

          {!metadataSeoResult && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sačuvajte SEO metadata pre analize. Agent crawluje poslednje
              sačuvane javne stranice: Home, Usluge i Termini.
            </p>
          )}

          {metadataSeoResult?.snapshotSource && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Snapshot:{" "}
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                {metadataSeoResult.snapshotSource === "rendered-dom"
                  ? "renderovane javne stranice"
                  : "CMS fallback"}
              </span>
              {metadataSeoResult.crawlError
                ? ` — ${metadataSeoResult.crawlError}`
                : ""}
            </p>
          )}

          {metadataSeoResult && metadataSeoResult.issues.length > 0 && (
            <div>
              <p className={lbl}>Problemi</p>
              <ul className="space-y-1.5">
                {metadataSeoResult.issues.map((issue, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
                  >
                    <span className="mt-0.5 shrink-0">✕</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {metadataSeoResult &&
            metadataSeoResult.suggestions.length > 0 && (
              <div>
                <p className={lbl}>Preporuke</p>
                <ul className="space-y-1.5">
                  {metadataSeoResult.suggestions.map((suggestion, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="mt-0.5 shrink-0 text-violet-500">
                        →
                      </span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {metadataSeoResult && metadataSeoResult.keywords.length > 0 && (
            <div>
              <p className={lbl}>Predloženi ključni pojmovi</p>
              <div className="flex flex-wrap gap-2">
                {metadataSeoResult.keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="space-y-5">
        {(
          [
            { page: "Početna", tk: "homeTitle", dk: "homeDescription" },
            {
              page: "Usluge",
              tk: "uslugeTitle",
              dk: "uslugeDescription",
            },
            {
              page: "Termini",
              tk: "terminiTitle",
              dk: "terminiDescription",
            },
          ] as const
        ).map(({ page, tk, dk }) => (
          <div
            key={page}
            className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3"
          >
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 rounded-lg">
              {page}
            </span>
            <div className="mt-2">
              <label className={lbl}>
                Title{" "}
                <span className="font-normal normal-case text-gray-300 dark:text-gray-600">
                  · max 60
                </span>
              </label>
              <input
                className={inp}
                value={sp.form.seo[tk] ?? ""}
                onChange={(e) => sp.setSeoField(tk, e.target.value)}
                placeholder={`${page} – naziv salona`}
                maxLength={60}
              />
              <p className="text-[11px] text-right mt-1 text-gray-400">
                {(sp.form.seo[tk] ?? "").length}/60
              </p>
            </div>
            <div>
              <label className={lbl}>
                Description{" "}
                <span className="font-normal normal-case text-gray-300 dark:text-gray-600">
                  · max 160
                </span>
              </label>
              <textarea
                className={inp + " resize-none"}
                rows={2}
                value={sp.form.seo[dk] ?? ""}
                onChange={(e) => sp.setSeoField(dk, e.target.value)}
                placeholder="Kratki opis stranice..."
                maxLength={160}
              />
              <p className="text-[11px] text-right mt-1 text-gray-400">
                {(sp.form.seo[dk] ?? "").length}/160
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button
          onClick={handleSaveMetadataSeo}
          disabled={sp.isSaving}
          className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50"
        >
          {sp.isSaving ? "Snimanje..." : "Sačuvaj SEO"}
        </button>
      </div>
    </div>
  </div>
  );
}
