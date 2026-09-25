"use client";

import { useEffect, useState } from "react";
import type { LandingStructure } from "@/types";
import type { MarketingBanner } from "@/types/theme8-marketing";
import {
  EDUCATION_BANNER_PRESET,
  insertMarketingBanner,
  moveMarketingBanner,
  resolveTheme8SectionOrder,
} from "@/lib/theme8/marketing-layout";
import { ToggleSwitch } from "./primitives";
import { Theme8MarketingBannerFields } from "./Theme8MarketingBannerFields";

interface Props {
  value: LandingStructure;
  onChange: (next: LandingStructure) => void;
}

const LABELS: Record<string, string> = {
  hero: "Hero",
  about: "O salonu",
  "social-proof": "Instagram / poverenje",
  services: "Cenovnik",
  gallery: "Galerija",
  perks: "Benefiti",
  testimonials: "Utisci",
  faq: "Pitanja i odgovori",
  tribute: "Završni deo",
};

const action = "rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800";

export function Theme8MarketingBanners({ value, onChange }: Props) {
  const [newBannerId, setNewBannerId] = useState<string | null>(null);
  const banners = value.marketingBanners ?? [];
  const order = resolveTheme8SectionOrder(value.sectionOrder, banners.map((banner) => banner.id));
  const byId = new Map(banners.map((banner) => [banner.id, banner]));

  const update = (nextBanners: MarketingBanner[], nextOrder = order) =>
    onChange({ ...value, marketingBanners: nextBanners, sectionOrder: nextOrder });

  const updateBanner = (id: string, patch: Partial<MarketingBanner>) =>
    update(banners.map((banner) => banner.id === id ? { ...banner, ...patch } : banner));

  const addBanner = (preset?: MarketingBanner, name?: string) => {
    const banner: MarketingBanner = preset ?? {
      id: crypto.randomUUID(),
      name,
      enabled: false,
      image: { url: "", alt: "" },
      containerStyle: "contained",
      cta: { enabled: false, label: "Saznaj više", destination: { type: "custom", url: "" } },
    };
    if (byId.has(banner.id)) return;
    update([...banners, banner], insertMarketingBanner(order, banner.id));
    setNewBannerId(banner.id);
  };

  useEffect(() => {
    if (!newBannerId) return;
    const card = document.getElementById(`marketing-banner-editor-${newBannerId}`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    card?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }, [newBannerId]);

  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm dark:border-violet-900 dark:bg-gray-900 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Theme 8 / Marketing baneri</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Postojeće sekcije su zaključane. Baner pomerajte strelicama između njih; Hero ostaje prvi, footer poslednji.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!byId.has("education") && (
            <button type="button" className={action} onClick={() => addBanner(EDUCATION_BANNER_PRESET)}>
              + Dodaj edukaciju
            </button>
          )}
          <button type="button" className={action} onClick={() => addBanner()}>
            + Dodaj Marketing Banner
          </button>
          <button type="button" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600" onClick={() => addBanner(undefined, "Poklon vaučer")}>
            + Dodaj vaučer
          </button>
        </div>
      </div>

      <ol className="space-y-2">
        {order.map((sectionId, index) => {
          if (!sectionId.startsWith("marketing:")) {
            return (
              <li key={sectionId} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-950">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{LABELS[sectionId]}</span>
                <span className="text-xs text-gray-400">Zaključano</span>
              </li>
            );
          }
          const id = sectionId.slice(10);
          const banner = byId.get(id);
          if (!banner) return null;
          return (
            <li key={id} id={`marketing-banner-editor-${id}`} className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900 dark:bg-violet-950/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 dark:text-white">{banner.name?.trim() || banner.title?.trim() || "Novi marketing banner"}</span>
                  <span className="text-xs text-violet-600 dark:text-violet-300">Marketing Banner</span>
                </div>
                <div className="flex items-center gap-2">
                  <ToggleSwitch checked={banner.enabled} onChange={(enabled) => updateBanner(id, { enabled })} label={`Vidljivo: ${banner.name || banner.title || id}`} />
                  <button type="button" className={action} aria-label={`Pomeri ${banner.name || id} gore`} disabled={index <= 1} onClick={() => update(banners, moveMarketingBanner(order, id, -1))}>↑</button>
                  <button type="button" className={action} aria-label={`Pomeri ${banner.name || id} dole`} disabled={index >= order.length - 1} onClick={() => update(banners, moveMarketingBanner(order, id, 1))}>↓</button>
                  <button type="button" className={`${action} !text-red-600`} aria-label={`Ukloni ${banner.name || banner.title || id}`} onClick={() => update(banners.filter((item) => item.id !== id), order.filter((item) => item !== sectionId))}>Ukloni</button>
                </div>
              </div>
              <Theme8MarketingBannerFields banner={banner} onPatch={(patch) => updateBanner(id, patch)} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
