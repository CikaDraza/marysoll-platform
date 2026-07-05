"use client";
/** SecFaqSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function SecFaqSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* DEO 2 — FAQ */}
<div className={card}>
  <SectionHeader
    title="DEO 2 — FAQ (do 8 pitanja)"
    open={openSection === "sec-faq"}
    onToggle={() => toggle("sec-faq")}
  />
  {openSection === "sec-faq" && (
    <div className="mt-4 space-y-4">
      <div>
        <label className={lbl}>H2 naslov</label>
        <input
          className={inp}
          value={ls.secondary.faq.headline}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              faq: { ...ls.secondary.faq, headline: e.target.value },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Paragraf ispod naslova</label>
        <textarea
          className={inp}
          rows={2}
          value={ls.secondary.faq.paragraph}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              faq: { ...ls.secondary.faq, paragraph: e.target.value },
            })
          }
        />
      </div>
      {ls.secondary.faq.items.map((item, i) => (
        <div
          key={i}
          className="bg-slate-700/40 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-bold uppercase">
              Pitanje {i + 1}
            </p>
            <button
              className="text-xs text-red-400 hover:text-red-300 transition"
              onClick={() => {
                const items = ls.secondary.faq.items.filter(
                  (_, idx) => idx !== i,
                );
                update("secondary", {
                  ...ls.secondary,
                  faq: { ...ls.secondary.faq, items },
                });
              }}
            >
              Obriši
            </button>
          </div>
          <div>
            <label className={lbl}>Pitanje (H3)</label>
            <input
              className={inp}
              value={item.question}
              onChange={(e) => {
                const items = [...ls.secondary.faq.items];
                items[i] = { ...items[i], question: e.target.value };
                update("secondary", {
                  ...ls.secondary,
                  faq: { ...ls.secondary.faq, items },
                });
              }}
            />
          </div>
          <div>
            <label className={lbl}>
              Odgovor (prazno = kratak fallback)
            </label>
            <textarea
              className={inp}
              rows={3}
              value={item.answer}
              onChange={(e) => {
                const items = [...ls.secondary.faq.items];
                items[i] = { ...items[i], answer: e.target.value };
                update("secondary", {
                  ...ls.secondary,
                  faq: { ...ls.secondary.faq, items },
                });
              }}
            />
          </div>
        </div>
      ))}
      {ls.secondary.faq.items.length < 8 && (
        <button
          className="w-full py-2 border border-dashed border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-violet-500 hover:text-violet-400 transition"
          onClick={() => {
            const items = [
              ...ls.secondary.faq.items,
              { question: "", answer: "" },
            ];
            update("secondary", {
              ...ls.secondary,
              faq: { ...ls.secondary.faq, items },
            });
          }}
        >
          + Dodaj pitanje ({ls.secondary.faq.items.length}/8)
        </button>
      )}
    </div>
  )}
</div>
    </>
  );
}
