"use client";
/** SecNotebookSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function SecNotebookSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* DEO 2 — Sekcija 2: Sveska vs kalendar */}
<div className={card}>
  <SectionHeader
    title="DEO 2 — Sveska vs kalendar (Sekcija 2)"
    open={openSection === "sec-notebook"}
    onToggle={() => toggle("sec-notebook")}
  />
  {openSection === "sec-notebook" && (
    <div className="mt-4 space-y-3">
      <div>
        <label className={lbl}>Naslov</label>
        <input
          className={inp}
          value={ls.secondary.notebook.headline}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              notebook: {
                ...ls.secondary.notebook,
                headline: e.target.value,
              },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Lista (jedan po redu)</label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={4}
          value={ls.secondary.notebook.items.join("\n")}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              notebook: {
                ...ls.secondary.notebook,
                items: e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              },
            })
          }
        />
      </div>
    </div>
  )}
</div>
    </>
  );
}
