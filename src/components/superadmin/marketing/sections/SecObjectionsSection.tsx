"use client";
/** SecObjectionsSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function SecObjectionsSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* DEO 2 — Sekcija 1: Online zakazivanje */}
<div className={card}>
  <SectionHeader
    title="DEO 2 — Online zakazivanje (Sekcija 1)"
    open={openSection === "sec-objections"}
    onToggle={() => toggle("sec-objections")}
  />
  {openSection === "sec-objections" && (
    <div className="mt-4 space-y-3">
      <div>
        <label className={lbl}>Naslov</label>
        <input
          className={inp}
          value={ls.secondary.objections.headline}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              objections: {
                ...ls.secondary.objections,
                headline: e.target.value,
              },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Uvodni tekst (lead)</label>
        <input
          className={inp}
          value={ls.secondary.objections.lead}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              objections: {
                ...ls.secondary.objections,
                lead: e.target.value,
              },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>
          Baloni / citati (jedan po redu, animirani)
        </label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={3}
          value={ls.secondary.objections.bubbles.join("\n")}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              objections: {
                ...ls.secondary.objections,
                bubbles: e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Paragrafi (jedan po redu)</label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={4}
          value={ls.secondary.objections.paragraphs.join("\n")}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              objections: {
                ...ls.secondary.objections,
                paragraphs: e.target.value
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
