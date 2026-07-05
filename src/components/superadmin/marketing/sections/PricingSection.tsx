"use client";
/** PricingSection — deo Marketing taba (superadmin CMS).
 *  Stanje čita iz MarketingProvider konteksta — bez prop drilling-a. */
import { SectionHeader } from "../SectionHeader";
import {
  superAdminCardClass as card,
  superAdminInputClass as inp,
  superAdminLabelClass as lbl,
} from "@/components/superadmin/shared";
import { useMarketingContext } from "../MarketingProvider";

export function PricingSection() {
  const {
    landing: ls,
    update,
    openSection,
    toggle,
  } = useMarketingContext();

  return (
    <>
{/* Pricing */}
<div className={card}>
  <SectionHeader
    title="Cene (3 plana)"
    open={openSection === "pricing"}
    onToggle={() => toggle("pricing")}
  />
  {openSection === "pricing" && (
    <div className="mt-4 space-y-4">
      <div>
        <label className={lbl}>Naslov sekcije</label>
        <input
          className={inp}
          value={ls.pricing.headline}
          onChange={(e) =>
            update("pricing", {
              ...ls.pricing,
              headline: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>Paragraf ispod naslova</label>
        <textarea
          className={inp}
          rows={2}
          value={ls.pricing.paragraph}
          onChange={(e) =>
            update("pricing", {
              ...ls.pricing,
              paragraph: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>H3 naslov za planove</label>
        <input
          className={inp}
          value={ls.pricing.plansTitle}
          onChange={(e) =>
            update("pricing", {
              ...ls.pricing,
              plansTitle: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={lbl}>
          Objašnjenje Maria, Claudia i Kiki plana
        </label>
        <textarea
          className={inp}
          rows={3}
          value={ls.pricing.plansDescription}
          onChange={(e) =>
            update("pricing", {
              ...ls.pricing,
              plansDescription: e.target.value,
            })
          }
        />
      </div>
      {ls.pricing.plans.map((plan, i) => (
        <div
          key={i}
          className="bg-slate-700/40 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 font-bold uppercase">
              Plan {i + 1}
            </p>
            {plan.popular && (
              <span className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full">
                Popular
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Naziv</label>
              <input
                className={inp}
                value={plan.name}
                onChange={(e) => {
                  const plans = [...ls.pricing.plans];
                  plans[i] = { ...plans[i], name: e.target.value };
                  update("pricing", { ...ls.pricing, plans });
                }}
              />
            </div>
            <div>
              <label className={lbl}>Cena (samo broj)</label>
              <input
                className={inp}
                value={plan.price}
                onChange={(e) => {
                  const plans = [...ls.pricing.plans];
                  plans[i] = { ...plans[i], price: e.target.value };
                  update("pricing", { ...ls.pricing, plans });
                }}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Opis</label>
            <input
              className={inp}
              value={plan.description}
              onChange={(e) => {
                const plans = [...ls.pricing.plans];
                plans[i] = {
                  ...plans[i],
                  description: e.target.value,
                };
                update("pricing", { ...ls.pricing, plans });
              }}
            />
          </div>
          <div>
            <label className={lbl}>Features (jedan po redu)</label>
            <textarea
              className={`${inp} font-mono text-xs`}
              rows={4}
              value={plan.features.join("\n")}
              onChange={(e) => {
                const plans = [...ls.pricing.plans];
                plans[i] = {
                  ...plans[i],
                  features: e.target.value
                    .split("\n")
                    .filter(Boolean),
                };
                update("pricing", { ...ls.pricing, plans });
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>CTA tekst</label>
              <input
                className={inp}
                value={plan.ctaText}
                onChange={(e) => {
                  const plans = [...ls.pricing.plans];
                  plans[i] = {
                    ...plans[i],
                    ctaText: e.target.value,
                  };
                  update("pricing", { ...ls.pricing, plans });
                }}
              />
            </div>
            <div>
              <label className={lbl}>CTA link</label>
              <input
                className={inp}
                value={plan.ctaHref}
                onChange={(e) => {
                  const plans = [...ls.pricing.plans];
                  plans[i] = {
                    ...plans[i],
                    ctaHref: e.target.value,
                  };
                  update("pricing", { ...ls.pricing, plans });
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
    </>
  );
}
