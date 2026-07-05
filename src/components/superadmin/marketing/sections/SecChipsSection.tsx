"use client";
/** SecChipsSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function SecChipsSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* DEO 2 — Chips navigacija */}
<div className={card}>
  <SectionHeader
    title="DEO 2 — Chips navigacija"
    open={openSection === "sec-chips"}
    onToggle={() => toggle("sec-chips")}
  />
  {openSection === "sec-chips" && (
    <div className="mt-4 space-y-3">
      <div>
        <label className={lbl}>
          Chips (jedan po redu: Tekst|#anchor)
        </label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={9}
          value={ls.secondary.chips
            .map((c) => `${c.text}|${c.href}`)
            .join("\n")}
          onChange={(e) => {
            const chips = e.target.value
              .split("\n")
              .filter(Boolean)
              .map((line) => {
                const [text, href = "#"] = line.split("|");
                return { text: text.trim(), href: href.trim() };
              });
            update("secondary", { ...ls.secondary, chips });
          }}
        />
        <p className="text-[10px] text-slate-500 mt-1">
          Anchori: #online-zakazivanje, #sveska-ili-kalendar,
          #gledam-aplikaciju, #otkazivanja, #automatizacija, #faq
        </p>
      </div>
    </div>
  )}
</div>
    </>
  );
}
