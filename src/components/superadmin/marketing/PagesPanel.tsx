"use client";
/** PagesPanel — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import {
  superAdminCardClass as card,
  superAdminPrimaryButtonClass as btnPrimary,
  superAdminDangerButtonClass as btnDanger,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "./MarketingProvider";

export function PagesPanel() {
  const {
    pages,
    pagesLoading,
    deletePage,
    seedDefaults,
    openPageModal,
  } = useMarketingContext();

  return (
    <>
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-400">
        Markdown stranice (Terms, Privacy, Refund Policy...)
      </p>
      <div className="flex gap-2">
        <button
          className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600 transition"
          onClick={seedDefaults}
        >
          Seed defaults
        </button>
        <button
          className={btnPrimary}
          onClick={() => openPageModal(null)}
        >
          + Dodaj stranicu
        </button>
      </div>
    </div>

    {pagesLoading ? (
      <p className="text-slate-400 text-sm">Učitavanje...</p>
    ) : pages.length === 0 ? (
      <div className={`${card} text-center py-8`}>
        <p className="text-slate-400 text-sm mb-3">Nema stranica.</p>
        <p className="text-slate-500 text-xs">
          Klikni &quot;Seed defaults&quot; za Privacy, Terms i Refund
          Policy.
        </p>
      </div>
    ) : (
      <div className="space-y-2">
        {pages.map((p) => (
          <div
            key={p.slug}
            className={`${card} flex items-center justify-between`}
          >
            <div>
              <p className="font-semibold text-white text-sm">
                {p.title}
              </p>
              <p className="text-xs text-slate-400">
                /{p.slug} ·{" "}
                {p.updatedAt
                  ? new Date(p.updatedAt).toLocaleDateString("sr-Latn")
                  : "—"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600"
                onClick={() => openPageModal(p)}
              >
                Uredi
              </button>
              <button
                className={btnDanger}
                onClick={() => {
                  if (confirm(`Obriši stranicu "${p.title}"?`)) {
                    deletePage(p.slug);
                  }
                }}
              >
                Obriši
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
    </>
  );
}
