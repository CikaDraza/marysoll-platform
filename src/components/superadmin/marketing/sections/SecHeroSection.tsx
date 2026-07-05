"use client";
/** SecHeroSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function SecHeroSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* DEO 2 — Hero */}
<div className={card}>
  <SectionHeader
    title="DEO 2 — Hero"
    open={openSection === "sec-hero"}
    onToggle={() => toggle("sec-hero")}
  />
  {openSection === "sec-hero" && (
    <div className="mt-4 space-y-3">
      <div>
        <label className={lbl}>
          Eyebrow (mali tekst iznad naslova)
        </label>
        <input
          className={inp}
          value={ls.secondary.hero.eyebrow}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              hero: { ...ls.secondary.hero, eyebrow: e.target.value },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>H2 naslov</label>
        <input
          className={inp}
          value={ls.secondary.hero.headline}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              hero: {
                ...ls.secondary.hero,
                headline: e.target.value,
              },
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Paragraf</label>
        <textarea
          className={inp}
          rows={3}
          value={ls.secondary.hero.paragraph}
          onChange={(e) =>
            update("secondary", {
              ...ls.secondary,
              hero: {
                ...ls.secondary.hero,
                paragraph: e.target.value,
              },
            })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>CTA primarni tekst</label>
          <input
            className={inp}
            value={ls.secondary.hero.ctaPrimaryText}
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                hero: {
                  ...ls.secondary.hero,
                  ctaPrimaryText: e.target.value,
                },
              })
            }
          />
        </div>
        <div>
          <label className={lbl}>CTA primarni link</label>
          <input
            className={inp}
            value={ls.secondary.hero.ctaPrimaryHref}
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                hero: {
                  ...ls.secondary.hero,
                  ctaPrimaryHref: e.target.value,
                },
              })
            }
          />
        </div>
        <div>
          <label className={lbl}>CTA sekundarni tekst</label>
          <input
            className={inp}
            value={ls.secondary.hero.ctaSecondaryText}
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                hero: {
                  ...ls.secondary.hero,
                  ctaSecondaryText: e.target.value,
                },
              })
            }
          />
        </div>
        <div>
          <label className={lbl}>CTA sekundarni link</label>
          <input
            className={inp}
            value={ls.secondary.hero.ctaSecondaryHref}
            onChange={(e) =>
              update("secondary", {
                ...ls.secondary,
                hero: {
                  ...ls.secondary.hero,
                  ctaSecondaryHref: e.target.value,
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
