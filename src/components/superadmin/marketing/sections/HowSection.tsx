"use client";
/** HowSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function HowSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* How it works */}
<div className={card}>
  <SectionHeader
    title="Zašto Mary (do 6 stavki: staro vs novo)"
    open={openSection === "how"}
    onToggle={() => toggle("how")}
  />
  {openSection === "how" && (
    <div className="mt-4 space-y-4">
      <div>
        <label className={lbl}>Naslov sekcije</label>
        <input
          className={inp}
          value={ls.howItWorks.headline}
          onChange={(e) =>
            update("howItWorks", {
              ...ls.howItWorks,
              headline: e.target.value,
            })
          }
        />
      </div>
      {ls.howItWorks.items.map((item, i) => (
        <div
          key={i}
          className="bg-slate-700/40 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-bold uppercase">
              Stavka {i + 1}
            </p>
            {ls.howItWorks.items.length > 1 && (
              <button
                className="text-xs text-red-400 hover:text-red-300 transition"
                onClick={() => {
                  const items = ls.howItWorks.items.filter(
                    (_, idx) => idx !== i,
                  );
                  update("howItWorks", { ...ls.howItWorks, items });
                }}
              >
                Obriši
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Staro (✕)</label>
              <input
                className={inp}
                value={item.oldTitle}
                onChange={(e) => {
                  const items = [...ls.howItWorks.items];
                  items[i] = {
                    ...items[i],
                    oldTitle: e.target.value,
                  };
                  update("howItWorks", { ...ls.howItWorks, items });
                }}
              />
            </div>
            <div>
              <label className={lbl}>Novo (✓)</label>
              <input
                className={inp}
                value={item.newTitle}
                onChange={(e) => {
                  const items = [...ls.howItWorks.items];
                  items[i] = {
                    ...items[i],
                    newTitle: e.target.value,
                  };
                  update("howItWorks", { ...ls.howItWorks, items });
                }}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Opis</label>
            <input
              className={inp}
              value={item.description}
              onChange={(e) => {
                const items = [...ls.howItWorks.items];
                items[i] = {
                  ...items[i],
                  description: e.target.value,
                };
                update("howItWorks", { ...ls.howItWorks, items });
              }}
            />
          </div>
        </div>
      ))}
      {ls.howItWorks.items.length < 6 && (
        <button
          className="w-full py-2 border border-dashed border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-violet-500 hover:text-violet-400 transition"
          onClick={() => {
            const items = [
              ...ls.howItWorks.items,
              { oldTitle: "", newTitle: "", description: "" },
            ];
            update("howItWorks", { ...ls.howItWorks, items });
          }}
        >
          + Dodaj stavku ({ls.howItWorks.items.length}/6)
        </button>
      )}
    </div>
  )}
</div>
    </>
  );
}
