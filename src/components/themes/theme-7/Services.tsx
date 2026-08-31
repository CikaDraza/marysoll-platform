import Link from "next/link";
import {
  formatPriceToString,
  formatServicePrice,
  PRICE_ON_REQUEST_LABEL,
} from "@/helpers/formatPrice";
import {
  minServicePrice as minPrice,
  isPriceFrom,
} from "@/helpers/servicePrice";
import type { IService } from "@/types";
import { FadeUp } from "./FadeUp";

interface Props {
  services: IService[];
  tenantSlug?: string;
  headline?: string;
  subheadline?: string;
}

const MAX_ROWS = 8;

/** Display price string for a "menu" row. */
function priceLabel(s: IService): string {
  if (s.priceMode === "on_request") return PRICE_ON_REQUEST_LABEL;
  if (s.type === "single")
    return formatServicePrice(s.basePrice, s.priceMode, "") || "—";
  const mp = minPrice(s);
  if (mp == null) return "—";
  return isPriceFrom(s) ? `od ${formatPriceToString(mp)}` : formatPriceToString(mp);
}

export function Theme7Services({
  services,
  tenantSlug,
  headline,
  subheadline,
}: Props) {
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const bookHref = `${base}/termini`;
  const allHref = `${base}/usluge`;
  const rows = services.slice(0, MAX_ROWS);

  if (rows.length === 0) return null;

  return (
    <section id="services" className="bg-paper">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-28 lg:py-36">
        <FadeUp className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <div>
            <p className="flex items-center gap-3 text-[12px] uppercase tracking-[0.3em] text-neon mb-5">
              <span className="h-px w-10 bg-neon" />{" "}
              {headline || "Services & prices"}
            </p>
            <h2 className="font-cormorant text-5xl sm:text-6xl lg:text-7xl leading-[0.98] tracking-[-0.01em]">
              The menu
            </h2>
          </div>
          <p className="text-ink/55 max-w-sm lg:text-right">
            {subheadline ||
              "Every appointment includes a style consult and aftercare. Prices shown are starting from."}
          </p>
        </FadeUp>

        <div className="border-t border-ink/10">
          {rows.map((s, i) => (
            <FadeUp key={s._id} delay={i * 0.05}>
              <Link
                href={bookHref}
                className="group grid grid-cols-12 items-center gap-4 border-b border-ink/10 py-7 lg:py-8 hover:bg-rose/30 transition-colors duration-300 -mx-4 px-4 rounded-sm"
              >
                <div className="col-span-12 sm:col-span-4 flex items-center gap-5">
                  <span className="font-cormorant text-2xl text-ink/25 group-hover:text-neon transition-colors">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-cormorant text-2xl lg:text-3xl group-hover:translate-x-1 transition-transform duration-300">
                    {s.name}
                  </h3>
                </div>
                <p className="col-span-12 sm:col-span-6 text-ink/55 text-[15px] leading-relaxed">
                  {s.description}
                </p>
                <div className="col-span-12 sm:col-span-2 flex items-center justify-between sm:justify-end gap-4">
                  <span className="font-cormorant text-2xl lg:text-3xl whitespace-nowrap">
                    {priceLabel(s)}
                  </span>
                  <span className="grid place-items-center h-9 w-9 shrink-0 rounded-full border border-ink/15 text-ink/40 group-hover:bg-neon group-hover:border-neon group-hover:text-white transition-all duration-300">
                    &rarr;
                  </span>
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>

        {services.length > MAX_ROWS && (
          <div className="mt-10">
            <Link
              href={allHref}
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-neon hover:gap-3 transition-all"
            >
              Pogledaj sve usluge &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
