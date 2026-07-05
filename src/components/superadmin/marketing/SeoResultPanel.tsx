"use client";
/** SeoResultPanel — pomoćna komponenta Marketing taba (superadmin CMS). */
import { SeoFindings } from "@/components/seo/SeoFindings";
import type { useMarketingCms } from "@/hooks/useMarketingCms";

export function SeoResultPanel({
  seoResult,
}: {
  seoResult: ReturnType<typeof useMarketingCms>["seoResult"];
}) {
  if (!seoResult) return null;

  return (
    <div className="mt-4 space-y-3">
      {seoResult.findings?.length ? (
        <SeoFindings
          findings={seoResult.findings}
          technical={seoResult.technical}
          variant="superadmin"
        />
      ) : (
        <>
          {seoResult.issues.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-400 mb-1">Problemi</p>
              <ul className="space-y-1">
                {seoResult.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {seoResult.suggestions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-400 mb-1">Preporuke</p>
              <ul className="space-y-1">
                {seoResult.suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2">
                    <span className="text-amber-400 mt-0.5">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {seoResult.keywords.length > 0 && (
        <div>
          <p className="text-xs font-bold text-emerald-400 mb-2">Keywords</p>
          <div className="flex flex-wrap gap-1">
            {seoResult.keywords.map((kw, i) => (
              <span
                key={i}
                className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
