"use client";
/** FeaturesSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function FeaturesSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* Features */}
<div className={card}>
  <SectionHeader
    title="Feature kartice (3 kartice)"
    open={openSection === "features"}
    onToggle={() => toggle("features")}
  />
  {openSection === "features" && (
    <div className="mt-4 space-y-4">
      <div>
        <label className={lbl}>Naslov sekcije</label>
        <input
          className={inp}
          value={ls.features.headline}
          onChange={(e) =>
            update("features", {
              ...ls.features,
              headline: e.target.value,
            })
          }
        />
      </div>
      {ls.features.cards.map((card2, i) => (
        <div
          key={i}
          className="bg-slate-700/40 rounded-lg p-3 space-y-2"
        >
          <p className="text-xs text-slate-400 font-bold uppercase">
            Kartica {i + 1}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={lbl}>Ikona</label>
              <input
                className={inp}
                value={card2.icon}
                onChange={(e) => {
                  const cards = [...ls.features.cards];
                  cards[i] = { ...cards[i], icon: e.target.value };
                  update("features", { ...ls.features, cards });
                }}
              />
            </div>
            <div>
              <label className={lbl}>Problem</label>
              <input
                className={inp}
                value={card2.problem}
                onChange={(e) => {
                  const cards = [...ls.features.cards];
                  cards[i] = { ...cards[i], problem: e.target.value };
                  update("features", { ...ls.features, cards });
                }}
              />
            </div>
            <div>
              <label className={lbl}>Rešenje</label>
              <input
                className={inp}
                value={card2.solution}
                onChange={(e) => {
                  const cards = [...ls.features.cards];
                  cards[i] = {
                    ...cards[i],
                    solution: e.target.value,
                  };
                  update("features", { ...ls.features, cards });
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
    </>
  );
}
