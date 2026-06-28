"use client";

/**
 * Theme8AppointmentsPage — Y2K /termini inner page. Y2K header + working-hours /
 * legend / how-to cards, then the already-built Y2KHomepageAppointmentWidget
 * (live availability, week/day, BookingModal + guest→login flow). theme-8 only.
 */
import Link from "next/link";
import { FadeUp } from "../FadeUp";
import { Deco } from "../Decorations";
import Y2KHomepageAppointmentWidget from "../../shared/Y2KHomepageAppointmentWidget";
import { formatWorkingHoursForDisplay } from "@/helpers/parseWorkingHours";
import { shouldShowWorkingHours } from "@/helpers/workingHoursDisplay";
import { WorkingHoursNote } from "@/components/shared/WorkingHoursNote";
import type { IService, SalonProfileData } from "@/types";

interface Props {
  salon: SalonProfileData;
  services: IService[];
  tenantSlug?: string;
  clientSlug?: string;
  headline?: string;
  subheadline?: string;
  paragraph?: string;
}

const LEGEND = [
  { cls: "bg-white border-[3px] border-y2k-ink", label: "Radno vreme" },
  { cls: "bg-amber-200 border-[3px] border-y2k-ink", label: "Današnji dan" },
  { cls: "bg-red-300 border-[3px] border-y2k-ink", label: "Salon ne radi" },
  { cls: "bg-y2k-ink", label: "Zauzet termin" },
];

export function Theme8AppointmentsPage({
  salon,
  services,
  tenantSlug,
  clientSlug,
  headline,
  subheadline,
  paragraph,
}: Props) {
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const hours = formatWorkingHoursForDisplay(
    (salon.workingHours as Record<string, unknown>) ?? null,
  );

  return (
    <div className="pb-10">
      {/* header */}
      <section className="relative max-w-[1100px] mx-auto pt-12 pb-2 px-5 text-center">
        <Deco
          shape="heart"
          size={50}
          fill="#ff2e97"
          motionType="bob"
          className="absolute right-[5%] top-7 rotate-[10deg] hidden sm:block drop-shadow-[3px_4px_0_rgba(11,11,15,0.5)]"
        />
        <span className="inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink">
          {salon.name || "Termini"}
        </span>
        <h1 className="mt-1.5 font-bagel text-[clamp(40px,8vw,92px)] leading-[0.9] text-white [-webkit-text-stroke:3px_#0b0b0f] [text-shadow:5px_6px_0_rgba(255,46,151,0.7)] rotate-[-1deg]">
          {headline || "TERMINI"}
        </h1>
        {subheadline && (
          <p className="mt-5 max-w-xl mx-auto text-[16px] leading-[1.55] font-medium text-y2k-plum bg-white/70 backdrop-blur-[2px] px-4 py-3 rounded-[14px] border-2 border-y2k-ink/10">
            {subheadline}
          </p>
        )}
        {paragraph && (
          <p className="mt-3 max-w-2xl mx-auto text-[14px] leading-[1.6] font-medium text-white/85">
            {paragraph}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link
            href={`${base}/usluge`}
            className="inline-flex items-center gap-2 rounded-full border-[3px] border-y2k-ink bg-white px-6 py-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-y2k-ink shadow-[4px_4px_0_#8B16C9] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
          >
            Cenovnik usluga →
          </Link>
          <Link
            href={`${base}/register`}
            className="inline-flex items-center gap-2 rounded-full border-[3px] border-y2k-ink bg-y2k-pink px-6 py-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-white shadow-[4px_4px_0_#0b0b0f] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform"
          >
            Kreiraj nalog ★
          </Link>
        </div>
      </section>

      {/* info cards */}
      <section className="max-w-[1100px] mx-auto px-5 mt-10 grid gap-5 md:grid-cols-3">
        {/* working hours (sakriveno u manual režimu / kad vlasnik isključi) */}
        <FadeUp className="bg-white border-[3px] border-y2k-ink rounded-[20px] p-6 shadow-[5px_6px_0_#0b0b0f] rotate-[-0.6deg]">
          <h3 className="font-bagel text-[22px] text-y2k-ink mb-3">
            {shouldShowWorkingHours(salon) ? "Radno vreme" : "Zakazivanje"}
          </h3>
          {shouldShowWorkingHours(salon) ? (
            <ul className="space-y-1.5">
              {hours.map(({ day, hours: h, isOpen }) => (
                <li
                  key={day}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-[13px] font-bold text-y2k-ink">
                    {day}
                  </span>
                  <span
                    className={`text-[12px] font-extrabold px-2.5 py-1 rounded-full border-2 border-y2k-ink ${
                      isOpen
                        ? "bg-y2k-pink text-white"
                        : "bg-white text-[#9a7d8b]"
                    }`}
                  >
                    {h}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <WorkingHoursNote
              rulesHref={`${base}/pravila-zakazivanja`}
              className="text-[13px] text-y2k-ink/70"
            />
          )}
        </FadeUp>

        {/* legend */}
        <FadeUp className="bg-white border-[3px] border-y2k-ink rounded-[20px] p-6 shadow-[5px_6px_0_#8B16C9] rotate-[0.6deg]">
          <h3 className="font-bagel text-[22px] text-y2k-ink mb-3">Legenda</h3>
          <ul className="space-y-2.5">
            {LEGEND.map((l) => (
              <li
                key={l.label}
                className="flex items-center gap-2.5 text-[14px] font-semibold text-y2k-ink"
              >
                <span className={`w-4 h-4 rounded-[5px] ${l.cls}`} />
                {l.label}
              </li>
            ))}
          </ul>
        </FadeUp>

        {/* how to */}
        <FadeUp className="bg-y2k-pink text-white border-[3px] border-y2k-ink rounded-[20px] p-6 shadow-[5px_6px_0_#0b0b0f] rotate-[-0.4deg]">
          <h3 className="font-bagel text-[22px] mb-3">Kako zakazati?</h3>
          <ol className="space-y-1.5 text-[14px] font-semibold list-decimal pl-4">
            <li>Zakaži bez prijave (kao gost)</li>
            <li>Ili se registruj za bržе zakazivanje</li>
            <li>Izaberi slobodan termin ispod</li>
            <li>Odaberi uslugu i potvrdi ♡</li>
          </ol>
          <Link
            href={`${base}/register`}
            className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border-[3px] border-y2k-ink bg-white px-5 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.08em] text-y2k-purple shadow-[3px_3px_0_#0b0b0f]"
          >
            Kreiraj nalog →
          </Link>
        </FadeUp>
      </section>

      {/* booking widget (brings its own Y2K card) */}
      <section className="max-w-[860px] mx-auto px-5 mt-12">
        <h2 className="font-bagel text-[clamp(26px,4.5vw,40px)] text-white [-webkit-text-stroke:2px_#0b0b0f] [text-shadow:3px_4px_0_rgba(255,46,151,0.7)] rotate-[-1deg] mb-4 text-center">
          IZABERI TERMIN
        </h2>
        <Y2KHomepageAppointmentWidget
          tenantSlug={tenantSlug}
          clientSlug={clientSlug}
          salon={salon}
          services={services}
        />
      </section>
    </div>
  );
}
