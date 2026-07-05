"use client";
/**
 * MarketingTab — tanka kompozicija (Faza 4d refaktor, ranije 2.452 linije).
 *
 * Jedan izvor istine: MarketingProvider poziva useMarketingCms/useCmsPages
 * tačno jednom; sekcije/paneli žive u components/superadmin/marketing/ i
 * čitaju context — bez prop drilling-a. Server logika je u API rutama.
 */
import {
  MarketingProvider,
  useMarketingContext,
} from "@/components/superadmin/marketing/MarketingProvider";
import { LandingPanel } from "@/components/superadmin/marketing/LandingPanel";
import { PagesPanel } from "@/components/superadmin/marketing/PagesPanel";
import { PageModal } from "@/components/superadmin/marketing/PageModal";

function MarketingTabInner() {
  const {
    isLoading,
    activePanel,
    setActivePanel,
    showPageModal,
    modalPage,
    closePageModal,
    isMutating,
    updatePage,
    createPage,
  } = useMarketingContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        Učitavanje...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Panel tabs */}
      <div className="flex gap-2">
        {(["landing", "pages"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setActivePanel(p)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activePanel === p
                ? "bg-violet-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {p === "landing" ? "Landing sekcije" : "Stranice"}
          </button>
        ))}
      </div>

      {activePanel === "landing" && <LandingPanel />}
      {activePanel === "pages" && <PagesPanel />}

      {showPageModal && (
        <PageModal
          page={modalPage}
          onClose={closePageModal}
          isSaving={isMutating}
          onSave={async (data) => {
            if (modalPage) {
              await updatePage({
                slug: modalPage.slug,
                title: data.title,
                content: data.content,
              });
            } else {
              await createPage(data);
            }
          }}
        />
      )}
    </div>
  );
}

export function MarketingTab() {
  return (
    <MarketingProvider>
      <MarketingTabInner />
    </MarketingProvider>
  );
}
