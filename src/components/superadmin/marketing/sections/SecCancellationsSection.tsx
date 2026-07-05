"use client";
/** SecCancellationsSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function SecCancellationsSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* DEO 2 — Sekcija 4: Otkazivanja */}
<div className={card}>
  <SectionHeader
    title="DEO 2 — Otkazivanja (Sekcija 4)"
    open={openSection === "sec-cancellations"}
    onToggle={() => toggle("sec-cancellations")}
  />
  {openSection === "sec-cancellations" && (
    <div className="mt-4 space-y-3">
      <div>
        <label className={lbl}>Naslov</label>
        <input
          className={inp}
          value={ls.secondary.cancellations.headline}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              cancellations: {
                ...ls.secondary.cancellations,
                headline: e.target.value,
              },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>
          Paragrafi (jedan po redu, naizmenično ljubičasto/sivo)
        </label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={5}
          value={ls.secondary.cancellations.paragraphs.join("\n")}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              cancellations: {
                ...ls.secondary.cancellations,
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
