"use client";

/**
 * Theme8ServicesPage — full Y2K "THE MENU" for the /usluge inner page.
 * Reuses the home Theme8Services row pattern + formatPrice helpers, but shows
 * ALL services grouped by category (groupAndSortServices) and adds a Y2K CTA
 * that opens the booking modal. Rendered only for theme-8 tenants.
 */
import { useState } from "react";
import { FadeUp } from "../FadeUp";
import { Deco } from "../Decorations";
import { useTheme8Modal } from "../Theme8ModalProvider";
import { groupAndSortServices } from "@/helpers/groupeAndSortServices";
import {
  formatPriceToString,
  formatServicePrice,
  PRICE_ON_REQUEST_LABEL,
} from "@/helpers/formatPrice";
import type { IService } from "@/types";

interface Props {
  services: IService[];
  tenantSlug?: string;
  headline?: string;
  subheadline?: string;
  paragraph?: string;
  /** appointments CTA copy (from landingStructure.pages.appointmentsPage) */
  ctaHeadline?: string;
  ctaSubheadline?: string;
}

function minPrice(s: IService): number | null {
  if (s.type === "single") return s.basePrice ?? null;
  if (s.type === "variant") {
    const p = (s.variants ?? []).map((v) => v.price);
    return p.length ? Math.min(...p) : null;
  }
  if (s.type === "group") {
    const p = (s.services ?? [])
      .map((sv) => sv.price)
      .filter((x): x is number => x != null);
    return p.length ? Math.min(...p) : null;
  }
  return null;
}

function priceLabel(s: IService): string {
  if (s.priceMode === "on_request") return PRICE_ON_REQUEST_LABEL;
  if (s.type === "single")
    return formatServicePrice(s.basePrice, s.priceMode, "") || "—";
  // Varijante se prikazuju kao razbijena lista (svaka cena posebno).
  if (s.type === "variant") return "";
  const mp = minPrice(s);
  return mp != null ? `od ${formatPriceToString(mp)}` : "—";
}

/** Malo Y2K srce kao bullet za "šta usluga sadrži" (umesto check ikone). */
function HeartBullet() {
  return (
    <svg
      viewBox="0 0 100 100"
      width={15}
      height={15}
      aria-hidden="true"
      className="mt-[3px] shrink-0 rotate-[-8deg]"
    >
      <path
        d="M50 88 C18 64 6 44 6 28 C6 14 17 6 29 6 C38 6 46 11 50 20 C54 11 62 6 71 6 C83 6 94 14 94 28 C94 44 82 64 50 88 Z"
        fill="#ff2e97"
        stroke="#0b0b0f"
        strokeWidth={6}
      />
    </svg>
  );
}

function MenuRow({ s, index }: { s: IService; index: number }) {
  const [open, setOpen] = useState(false);
  const featured = s.featured && s.featured !== "none";
  const variants = s.type === "variant" ? (s.variants ?? []) : [];
  const items = (s.items ?? []).map((x) => x.trim()).filter(Boolean);
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="w-full flex items-start gap-3 sm:gap-4 py-5 text-left border-b-2 border-dashed border-y2k-ink/20 last:border-b-0 group"
    >
      <span className="font-bagel text-[22px] sm:text-[26px] text-y2k-pink w-8 sm:w-10 shrink-0">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="font-extrabold text-[18px] sm:text-[21px] text-y2k-ink flex items-center gap-2 flex-wrap">
            {s.name}
            {s.subcategory && (
              <span className="text-[#9a7d8b] font-semibold">
                — {s.subcategory}
              </span>
            )}
            {featured && (
              <span className="bg-y2k-pink text-white text-[11px] font-extrabold tracking-[0.1em] px-2 py-0.5 rounded-full rotate-[-3deg] inline-block">
                POPULAR
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {s.type !== "variant" && (
              <span className="hidden sm:block font-bagel text-[24px] text-y2k-ink whitespace-nowrap">
                {priceLabel(s)}
              </span>
            )}
            <span
              className={`grid place-items-center w-[30px] h-[30px] border-[3px] border-y2k-ink rounded-full text-[16px] font-extrabold leading-none transition-all duration-300 ${
                open ? "rotate-[135deg] bg-y2k-pink text-white" : "text-y2k-ink"
              }`}
            >
              +
            </span>
          </div>
        </div>
        {s.type !== "variant" && (
          <div className="sm:hidden font-bagel text-[20px] text-y2k-ink mt-1">
            {priceLabel(s)}
          </div>
        )}
        {/* varijante: sve cene uvek vidljive (standard + korekcije),
            isti izgled kao na početnoj — font-bagel cena bez "RSD" */}
        {variants.length > 0 && (
          <ul className="mt-2.5 space-y-2">
            {variants.map((v, i) => (
              <li key={i}>
                <div className="flex items-baseline gap-2">
                  <span className="font-extrabold text-[15px] sm:text-[16px] text-y2k-ink">
                    {v.name}
                  </span>
                  <span className="flex-1 border-b-2 border-dashed border-y2k-ink/20 -translate-y-[3px]" />
                  <span className="font-bagel text-[18px] sm:text-[20px] text-y2k-ink whitespace-nowrap">
                    {formatServicePrice(v.price, v.priceMode, "")}
                  </span>
                </div>
                {v.description && (
                  <p className="mt-0.5 font-medium text-[13px] text-[#9a7d8b] leading-[1.4]">
                    {v.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {/* opis + šta usluga sadrži — otvara se na tap */}
        <div
          className={`overflow-hidden transition-[max-height] duration-500 ease-in-out mt-1.5 ${
            open ? "max-h-[1200px]" : "max-h-[1.5rem]"
          }`}
        >
          <p className="font-medium text-[#4a3340] text-[15px] leading-[1.5]">
            {s.description}
          </p>
          {/* šta usluga sadrži — srca umesto check ikone, uz mali nagib */}
          {items.length > 0 && (
            <ul className="mt-3 p-1.5 space-y-1.5 rotate-[-0.8deg]">
              {items.map((it, i) => (
                <li key={i} className="flex items-start gap-2">
                  <HeartBullet />
                  <span className="font-medium text-[14px] text-[#4a3340] leading-[1.45]">
                    {it}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </button>
  );
}

export function Theme8ServicesPage({
  services,
  headline,
  subheadline,
  paragraph,
  ctaHeadline,
  ctaSubheadline,
}: Props) {
  const { open } = useTheme8Modal();
  const groups = groupAndSortServices(services);

  return (
    <div className="pb-8">
      {/* page header */}
      <section className="relative max-w-[1040px] mx-auto pt-12 pb-2 px-5 text-center">
        <Deco
          shape="star"
          size={54}
          className="absolute left-[4%] top-6 rotate-[-12deg] hidden sm:block drop-shadow-[3px_4px_0_rgba(11,11,15,0.5)]"
        />
        <span className="[-webkit-text-stroke:0.125px_#fff] inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink">
          {"Ponuda The Lash Room Studio by Anja"}
        </span>
        <h1 className="mt-1.5 font-bagel [-webkit-text-stroke:1px_#ff2e97] text-[clamp(46px,9vw,104px)] leading-[0.9] text-y2k-ink rotate-[-1.5deg]">
          {headline || "Services & prices"}
        </h1>
        {subheadline && (
          <p className="mt-5 max-w-xl mx-auto text-[16px] leading-[1.55] font-medium text-white/85 px-4 py-3 rounded-[14px]">
            {subheadline}
          </p>
        )}
        {paragraph && (
          <p className="mt-3 max-w-2xl mx-auto text-[14px] leading-[1.6] font-medium text-white/85">
            {paragraph}
          </p>
        )}
      </section>

      {/* category panels */}
      {services.length === 0 ? (
        <p className="text-center font-bagel text-2xl text-white/80 py-20">
          Usluge još uvek nisu dodate ♡
        </p>
      ) : (
        <div className="max-w-[1040px] mx-auto px-5 mt-10 space-y-16">
          {groups.map((group, gi) => (
            <FadeUp key={group.category || gi}>
              <h2 className="relative font-bagel text-[clamp(30px,5vw,56px)] leading-[0.95] text-white [-webkit-text-stroke:3px_#0b0b0f] [text-shadow:4px_5px_0_rgba(255,46,151,0.7)] rotate-[-1deg] mb-4 z-3 ml-1">
                {group.category || "Usluge"}
              </h2>
              <div
                className={`relative ${gi % 2 === 0 ? "rotate-[0.6deg]" : "rotate-[-0.6deg]"}`}
              >
                <div className="absolute -inset-2.5 bg-white [filter:url(#y2k-torn)] shadow-[0_24px_56px_rgba(20,0,30,0.4)]" />
                <div className="relative px-6 sm:px-9 py-1.5">
                  {group.services.map((s, i) => (
                    <MenuRow key={s._id ?? i} s={s} index={i} />
                  ))}
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      )}

      {/* Y2K booking CTA */}
      <section className="max-w-[1040px] mx-auto px-5 mt-20">
        <div className="relative bg-y2k-ink rounded-[34px] p-10 sm:p-12 overflow-hidden rotate-[-1deg] shadow-[0_30px_70px_rgba(20,0,30,0.5)] text-center">
          <div className="absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(255,46,151,0.4),transparent_60%)] pointer-events-none" />
          <h2 className="relative m-0 font-bagel text-[clamp(34px,6vw,68px)] leading-[0.9] text-white">
            {ctaHeadline || "Spremni za vase"}
            <br />
            <span className="text-y2k-hot">
              {ctaSubheadline || "najbolje trepavice?"}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => open("book")}
            className="relative mt-7 inline-flex items-center gap-2.5 bg-y2k-pink text-white font-black text-[17px] tracking-[0.04em] uppercase px-8 py-4 border-[4px] border-white rounded-[42px_34px_44px_32px/34px_44px_32px_44px] shadow-[7px_7px_0_rgba(255,46,151,0.45)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer"
          >
            Zakaži termin ★
          </button>
        </div>
      </section>
    </div>
  );
}
