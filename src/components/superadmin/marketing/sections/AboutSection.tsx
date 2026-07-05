"use client";
/** AboutSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function AboutSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* About */}
<div className={card}>
  <SectionHeader
    title="About sekcija"
    open={openSection === "about"}
    onToggle={() => toggle("about")}
  />
  {openSection === "about" && (
    <div className="mt-4 space-y-3">
      <div>
        <label className={lbl}>H2 naslov</label>
        <textarea
          className={inp}
          rows={2}
          value={ls.about.headline}
          onChange={(e) =>
            update("about", {
              ...ls.about,
              headline: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Lista benefita (jedan po redu)</label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={5}
          value={ls.about.bullets.join("\n")}
          onChange={(e) =>
            update("about", {
              ...ls.about,
              bullets: e.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Paragrafi (jedan po redu)</label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={6}
          value={ls.about.paragraphs.join("\n")}
          onChange={(e) =>
            update("about", {
              ...ls.about,
              paragraphs: e.target.value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
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
