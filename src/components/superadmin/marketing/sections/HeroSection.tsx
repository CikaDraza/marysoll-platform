"use client";
/** HeroSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function HeroSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* Hero */}
<div className={card}>
  <SectionHeader
    title="Hero sekcija"
    open={openSection === "hero"}
    onToggle={() => toggle("hero")}
  />
  {openSection === "hero" && (
    <div className="mt-4 space-y-3">
      <div>
        <label className={lbl}>
          Headline (svaki novi red = novi red u H1, 2+ red je
          ljubičast)
        </label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={3}
          value={ls.hero.headline}
          onChange={(e) =>
            update("hero", { ...ls.hero, headline: e.target.value })
          }
          placeholder={"Automatizuj\nsvoj salon"}
        />
      </div>
      <div>
        <label className={lbl}>Subheadline</label>
        <textarea
          className={inp}
          rows={4}
          value={ls.hero.subheadline}
          onChange={(e) =>
            update("hero", {
              ...ls.hero,
              subheadline: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Social proof tekst</label>
        <input
          className={inp}
          value={ls.hero.socialProofText}
          onChange={(e) =>
            update("hero", {
              ...ls.hero,
              socialProofText: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Bedževi (jedan po redu)</label>
        <textarea
          className={`${inp} font-mono text-xs`}
          rows={4}
          value={ls.hero.badges.map((b) => b.text).join("\n")}
          onChange={(e) => {
            const badges = e.target.value
              .split("\n")
              .filter(Boolean)
              .map((t) => ({ text: t.trim() }));
            update("hero", { ...ls.hero, badges });
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>CTA primarni tekst</label>
          <input
            className={inp}
            value={ls.hero.ctaPrimaryText}
            onChange={(e) =>
              update("hero", {
                ...ls.hero,
                ctaPrimaryText: e.target.value,
              })
            }
          />
        </div>
        <div>
          <label className={lbl}>CTA primarni link</label>
          <input
            className={inp}
            value={ls.hero.ctaPrimaryHref}
            onChange={(e) =>
              update("hero", {
                ...ls.hero,
                ctaPrimaryHref: e.target.value,
              })
            }
          />
        </div>
        <div>
          <label className={lbl}>CTA sekundarni tekst</label>
          <input
            className={inp}
            value={ls.hero.ctaSecondaryText}
            onChange={(e) =>
              update("hero", {
                ...ls.hero,
                ctaSecondaryText: e.target.value,
              })
            }
          />
        </div>
        <div>
          <label className={lbl}>CTA sekundarni link</label>
          <input
            className={inp}
            value={ls.hero.ctaSecondaryHref}
            onChange={(e) =>
              update("hero", {
                ...ls.hero,
                ctaSecondaryHref: e.target.value,
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
