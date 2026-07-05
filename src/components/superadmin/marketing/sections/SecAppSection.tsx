"use client";
/** SecAppSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function SecAppSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* DEO 2 — Sekcija 3: Teme aplikacije */}
<div className={card}>
  <SectionHeader
    title="DEO 2 — Teme aplikacije (Sekcija 3)"
    open={openSection === "sec-app"}
    onToggle={() => toggle("sec-app")}
  />
  {openSection === "sec-app" && (
    <div className="mt-4 space-y-4">
      <div>
        <label className={lbl}>Naslov</label>
        <input
          className={inp}
          value={ls.secondary.app.headline}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              app: { ...ls.secondary.app, headline: e.target.value },
            })
          }
        />
      </div>
      {ls.secondary.app.topics.map((topic, i) => (
        <div
          key={i}
          className="bg-slate-700/40 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-bold uppercase">
              Tema {i + 1}
            </p>
            {ls.secondary.app.topics.length > 1 && (
              <button
                className="text-xs text-red-400 hover:text-red-300 transition"
                onClick={() => {
                  const topics = ls.secondary.app.topics.filter(
                    (_, idx) => idx !== i,
                  );
                  update("secondary", {
                    ...ls.secondary,
                    app: { ...ls.secondary.app, topics },
                  });
                }}
              >
                Obriši
              </button>
            )}
          </div>
          <div>
            <label className={lbl}>H3 naslov</label>
            <input
              className={inp}
              value={topic.title}
              onChange={(e) => {
                const topics = [...ls.secondary.app.topics];
                topics[i] = { ...topics[i], title: e.target.value };
                update("secondary", {
                  ...ls.secondary,
                  app: { ...ls.secondary.app, topics },
                });
              }}
            />
          </div>
          <div>
            <label className={lbl}>Objašnjenje</label>
            <textarea
              className={inp}
              rows={2}
              value={topic.description}
              onChange={(e) => {
                const topics = [...ls.secondary.app.topics];
                topics[i] = {
                  ...topics[i],
                  description: e.target.value,
                };
                update("secondary", {
                  ...ls.secondary,
                  app: { ...ls.secondary.app, topics },
                });
              }}
            />
          </div>
        </div>
      ))}
      <button
        className="w-full py-2 border border-dashed border-slate-600 text-slate-400 text-xs font-bold rounded-lg hover:border-violet-500 hover:text-violet-400 transition"
        onClick={() => {
          const topics = [
            ...ls.secondary.app.topics,
            { title: "", description: "" },
          ];
          update("secondary", {
            ...ls.secondary,
            app: { ...ls.secondary.app, topics },
          });
        }}
      >
        + Dodaj temu
      </button>
    </div>
  )}
</div>
    </>
  );
}
