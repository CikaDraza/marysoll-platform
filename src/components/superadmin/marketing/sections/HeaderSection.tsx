"use client";
/** HeaderSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function HeaderSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* Header */}
<div className={card}>
  <SectionHeader
    title="Header"
    open={openSection === "header"}
    onToggle={() => toggle("header")}
  />
  {openSection === "header" && (
    <div className="mt-4 space-y-3">
      <div>
        <label className={lbl}>Logo tekst</label>
        <input
          className={inp}
          value={ls.header.logoText}
          onChange={(e) =>
            update("header", {
              ...ls.header,
              logoText: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>CTA dugme tekst</label>
        <input
          className={inp}
          value={ls.header.ctaText}
          onChange={(e) =>
            update("header", {
              ...ls.header,
              ctaText: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>CTA link</label>
        <input
          className={inp}
          value={ls.header.ctaHref}
          onChange={(e) =>
            update("header", {
              ...ls.header,
              ctaHref: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>
          Nav linkovi (jedan po redu: Tekst|/href)
        </label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={3}
          value={ls.header.navLinks
            .map((l) => `${l.text}|${l.href}`)
            .join("\n")}
          onChange={(e) => {
            const links = e.target.value
              .split("\n")
              .filter(Boolean)
              .map((line) => {
                const [text, href = "#"] = line.split("|");
                return { text: text.trim(), href: href.trim() };
              });
            update("header", { ...ls.header, navLinks: links });
          }}
        />
      </div>
    </div>
  )}
</div>
    </>
  );
}
