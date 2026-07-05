"use client";
/** FooterSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function FooterSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* Footer */}
<div className={card}>
  <SectionHeader
    title="Footer"
    open={openSection === "footer"}
    onToggle={() => toggle("footer")}
  />
  {openSection === "footer" && (
    <div className="mt-4 space-y-3">
      <div>
        <label className={lbl}>Tagline</label>
        <input
          className={inp}
          value={ls.footer.tagline}
          onChange={(e) =>
            update("footer", {
              ...ls.footer,
              tagline: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>
          Linkovi (jedan po redu: Tekst|/href)
        </label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={4}
          value={ls.footer.links
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
            update("footer", { ...ls.footer, links });
          }}
        />
      </div>
    </div>
  )}
</div>

{/* ════════ DEO 2 (Secondary Content) ════════ */}
    </>
  );
}
