/**
 * Theme9FinalCta — završni panel: poruka levo, prikaz slobodnih termina desno.
 *
 * PRIKAZ TERMINA JE PRIVREMEN. Dizajn ovde traži BookingWidget, ali stvarni
 * widget dolazi tek sa T3 Booking Engine-om i `availability-core` slojem
 * (Slice 3–4). Do tada ovo crta *statične* slotove iz CMS-a — dakle informaciju,
 * ne dostupnost. Zato slotovi nisu dugmad i CTA je inertan (`BookingCta`):
 * ne sme se stvoriti utisak da je termin rezervisan klikom.
 *
 * Kada widget stigne, ova sekcija dobija njegov `slot` i statični blok nestaje.
 */
import { BookingCta } from "./BookingCta";
import { Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9FinalCtaProps {
  eyebrow?: string;
  headline?: string;
  lead?: string;
  calendar?: {
    label?: string;
    month?: string;
    slots: { day: string; time: string; selected?: boolean }[];
  };
  ctaLabel?: string;
  note?: string;
}

export function Theme9FinalCta({
  eyebrow,
  headline,
  lead,
  calendar,
  ctaLabel,
  note,
}: Theme9FinalCtaProps) {
  if (!headline && !calendar?.slots.length) return null;

  return (
    <section id="final-cta" className="bg-ee-canvas">
      <div className="mx-auto max-w-[1240px] px-5 pb-14 md:px-8 md:pb-20 lg:px-14 lg:pb-[110px]">
        <Reveal>
          <div className="bg-ee-terracotta grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-center gap-7 rounded-[28px] p-9 md:p-14 lg:gap-[60px] lg:p-[76px]">
            <div className="flex flex-col gap-[22px]">
              {eyebrow && <Eyebrow tone="coffee">{eyebrow}</Eyebrow>}
              {headline && (
                <h2 className="font-newsreader text-ee-text max-w-[24ch] text-[clamp(30px,3.9vw,54px)] leading-[1.04] tracking-[-0.024em]">
                  {headline}
                </h2>
              )}
              {lead && (
                <p className="font-instrument-sans text-ee-text/78 max-w-[44ch] text-[16.5px] leading-[1.7]">
                  {lead}
                </p>
              )}
            </div>

            <div className="bg-ee-surface flex flex-col gap-[18px] rounded-[22px] p-6 lg:p-8">
              <div className="flex items-center justify-between">
                <span className="text-ee-text-muted text-[12px] tracking-[0.12em] uppercase">
                  {calendar?.label || "Slobodni termini"}
                </span>
                {calendar?.month && (
                  <span className="text-ee-sage text-[12px]">{calendar.month}</span>
                )}
              </div>

              {calendar && calendar.slots.length > 0 && (
                /* Statičan prikaz, ne izbor — vidi napomenu na vrhu fajla. */
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {calendar.slots.map((slot) => (
                    <li
                      key={`${slot.day}-${slot.time}`}
                      className={`rounded-[12px] border px-1.5 py-[11px] text-center text-[13px] ${
                        slot.selected
                          ? "border-ee-accent bg-ee-accent text-white"
                          : "border-ee-border text-ee-text"
                      }`}
                    >
                      {slot.day}
                      <span
                        className={`block text-[11px] ${slot.selected ? "text-ee-accent-contrast" : "text-ee-text-muted"}`}
                      >
                        {slot.time}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <BookingCta
                label={ctaLabel || "Otvori zakazivanje"}
                className="self-start py-2 pr-6 pl-2 text-[14.5px]"
              />

              {note && (
                <p className="text-ee-text-muted text-[12px] leading-[1.5]">
                  {note}
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
