"use client";
/** SecAutomationSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function SecAutomationSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* DEO 2 — Sekcija 5: Automatizacija */}
<div className={card}>
  <SectionHeader
    title="DEO 2 — Automatizacija (Sekcija 5)"
    open={openSection === "sec-automation"}
    onToggle={() => toggle("sec-automation")}
  />
  {openSection === "sec-automation" && (
    <div className="mt-4 space-y-4">
      <div>
        <label className={lbl}>Naslov</label>
        <input
          className={inp}
          value={ls.secondary.automation.headline}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              automation: {
                ...ls.secondary.automation,
                headline: e.target.value,
              },
            })
          }
        />
      </div>
      {ls.secondary.automation.items.map((item, i) => (
        <div
          key={i}
          className="bg-slate-700/40 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-bold uppercase">
              Stavka {i + 1}
            </p>
            {ls.secondary.automation.items.length > 1 && (
              <button
                className="text-xs text-red-400 hover:text-red-300 transition"
                onClick={() => {
                  const items = ls.secondary.automation.items.filter(
                    (_, idx) => idx !== i,
                  );
                  update("secondary", {
                    ...ls.secondary,
                    automation: { ...ls.secondary.automation, items },
                  });
                }}
              >
                Obriši
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className={lbl}>Ikona</label>
              <input
                className={inp}
                value={item.icon}
                onChange={(e) => {
                  const items = [...ls.secondary.automation.items];
                  items[i] = { ...items[i], icon: e.target.value };
                  update("secondary", {
                    ...ls.secondary,
                    automation: { ...ls.secondary.automation, items },
                  });
                }}
              />
            </div>
            <div className="col-span-3">
              <label className={lbl}>Naslov</label>
              <input
                className={inp}
                value={item.title}
                onChange={(e) => {
                  const items = [...ls.secondary.automation.items];
                  items[i] = { ...items[i], title: e.target.value };
                  update("secondary", {
                    ...ls.secondary,
                    automation: { ...ls.secondary.automation, items },
                  });
                }}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Opis</label>
            <textarea
              className={inp}
              rows={2}
              value={item.description}
              onChange={(e) => {
                const items = [...ls.secondary.automation.items];
                items[i] = {
                  ...items[i],
                  description: e.target.value,
                };
                update("secondary", {
                  ...ls.secondary,
                  automation: { ...ls.secondary.automation, items },
                });
              }}
            />
          </div>
        </div>
      ))}
      <button
        className="w-full py-2 border border-dashed border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-violet-500 hover:text-violet-400 transition"
        onClick={() => {
          const items = [
            ...ls.secondary.automation.items,
            { icon: "", title: "", description: "" },
          ];
          update("secondary", {
            ...ls.secondary,
            automation: { ...ls.secondary.automation, items },
          });
        }}
      >
        + Dodaj stavku
      </button>

      <div className="bg-slate-700/40 rounded-lg p-3 space-y-2">
        <p className="text-xs text-slate-400 font-bold uppercase">
          Google primer
        </p>
        <div>
          <label className={lbl}>Pitanje</label>
          <input
            className={inp}
            value={ls.secondary.automation.assistantExample.question}
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                automation: {
                  ...ls.secondary.automation,
                  assistantExample: {
                    ...ls.secondary.automation.assistantExample,
                    question: e.target.value,
                  },
                },
              })
            }
          />
        </div>
        <div>
          <label className={lbl}>Naslov odgovora</label>
          <input
            className={inp}
            value={
              ls.secondary.automation.assistantExample.replyTitle
            }
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                automation: {
                  ...ls.secondary.automation,
                  assistantExample: {
                    ...ls.secondary.automation.assistantExample,
                    replyTitle: e.target.value,
                  },
                },
              })
            }
          />
        </div>
        <div>
          <label className={lbl}>
            Stavke rasporeda (jedna po redu)
          </label>
          <textarea
            className={`${inp} font-mono text-xs`}
            rows={3}
            value={ls.secondary.automation.assistantExample.lines.join(
              "\n",
            )}
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                automation: {
                  ...ls.secondary.automation,
                  assistantExample: {
                    ...ls.secondary.automation.assistantExample,
                    lines: e.target.value
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean),
                  },
                },
              })
            }
          />
        </div>
      </div>
    </div>
  )}
</div>
    </>
  );
}
