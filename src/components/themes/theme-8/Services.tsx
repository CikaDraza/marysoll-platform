"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  formatPriceToString,
  formatServicePrice,
  PRICE_ON_REQUEST_LABEL,
} from "@/helpers/formatPrice";
import type { IService } from "@/types";
import { FadeUp } from "./FadeUp";

interface Props {
  services: IService[];
  tenantSlug?: string;
  headline?: string;
  subheadline?: string;
}

const MAX_ROWS = 8;

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

/** Display price string for a "menu" row. */
function priceLabel(s: IService): string {
  if (s.priceMode === "on_request") return PRICE_ON_REQUEST_LABEL;
  if (s.type === "single")
    return formatServicePrice(s.basePrice, s.priceMode, "") || "—";
  const mp = minPrice(s);
  return mp != null ? `od ${formatPriceToString(mp)}` : "—";
}

export function Theme8Services({
  services,
  tenantSlug,
  headline,
  subheadline,
}: Props) {
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const allHref = `${base}/usluge`;
  const rows = services.slice(0, MAX_ROWS);
  const [open, setOpen] = useState<number | null>(null);

  if (rows.length === 0) return null;

  return (
    <section
      id="services"
      className="relative max-w-[1040px] mx-auto my-28 px-5"
    >
      <FadeUp className="text-center mb-8 relative">
        <Image
          src="/images/theme-8/paint-streak.png"
          alt=""
          aria-hidden="true"
          width={560}
          height={200}
          className="absolute left-1/2 top-[48%] w-[560px] max-w-[104%] -translate-x-1/2 -translate-y-1/2 scale-110 opacity-90 z-0 pointer-events-none"
        />
        <span className="relative z-[1] inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink">
          {"Ponuda & Cenovnik"}
        </span>
        <h2 className="relative z-[1] mt-1.5 font-bagel text-[clamp(46px,8vw,100px)] leading-[0.9] text-y2k-ink rotate-[-1.5deg]">
          {headline || "THE MENU"}
        </h2>
      </FadeUp>

      <FadeUp>
        <div className="relative rotate-[1deg]">
          <div className="absolute -inset-2.5 bg-white [filter:url(#y2k-torn)] shadow-[0_24px_56px_rgba(20,0,30,0.4)]" />
          <div className="relative px-6 sm:px-9 py-1.5">
            {subheadline ? (
              <p className="text-center font-semibold text-[12px] tracking-[0.06em] text-[#9a7d8b] pt-3">
                {subheadline}
              </p>
            ) : (
              <p className="text-center font-semibold text-[12px] tracking-[0.06em] text-[#9a7d8b] pt-3">
                Tapni za ceo opis ↓
              </p>
            )}
            {rows.map((s, i) => {
              const isOpen = open === i;
              const featured = s.featured && s.featured !== "none";
              return (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-start gap-3 sm:gap-4 py-5 text-left border-b-2 border-dashed border-y2k-ink/20 last:border-b-0 group"
                >
                  <span className="font-bagel text-[22px] sm:text-[26px] text-y2k-pink w-8 sm:w-10 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    {/* name + (desktop price) + toggle */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-extrabold text-[18px] sm:text-[21px] text-y2k-ink flex items-center gap-2 flex-wrap">
                        {s.name}
                        {featured && (
                          <span className="bg-y2k-pink text-white text-[11px] font-extrabold tracking-[0.1em] px-2 py-0.5 rounded-full rotate-[-3deg] inline-block">
                            POPULAR
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:block font-bagel text-[24px] text-y2k-ink whitespace-nowrap">
                          {priceLabel(s)}
                        </span>
                        <span
                          className={`grid place-items-center w-[30px] h-[30px] border-[3px] border-y2k-ink rounded-full text-[16px] font-extrabold leading-none transition-all duration-300 ${
                            isOpen
                              ? "rotate-[135deg] bg-y2k-pink text-white"
                              : "text-y2k-ink"
                          }`}
                        >
                          +
                        </span>
                      </div>
                    </div>
                    {/* price below the name on mobile */}
                    <div className="sm:hidden font-bagel text-[20px] text-y2k-ink mt-1">
                      {priceLabel(s)}
                    </div>
                    {/* expandable description — animates height only, width stays fixed */}
                    <div
                      className={`overflow-hidden transition-[max-height] duration-500 ease-in-out mt-1.5 ${
                        isOpen ? "max-h-[600px]" : "max-h-[1.5rem]"
                      }`}
                    >
                      <p className="font-medium text-[#4a3340] text-[15px] leading-[1.5]">
                        {s.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </FadeUp>

      {services.length > MAX_ROWS && (
        <div className="mt-8 text-center">
          <Link
            href={allHref}
            className="inline-flex items-center gap-2 rounded-full border-[3px] border-y2k-ink bg-white px-6 py-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-y2k-ink shadow-[4px_4px_0_#8B16C9] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
          >
            Pogledaj sve usluge →
          </Link>
        </div>
      )}
    </section>
  );
}
