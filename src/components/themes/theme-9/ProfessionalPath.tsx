/**
 * Theme9ProfessionalPath — program za salone i timove, full-bleed forest.
 *
 * Ovo je INQUIRY kanal, ne checkout: cene su „od…", a CTA vodi na upit.
 * Kada bude prikazivao stvarne `EducationOffering` modele, blok prelazi na
 * `education.professional-path` sa capability-jem.
 */
import { AnchorLink } from "../shared/AnchorLink";
import { Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9ProfessionalPathProps {
  eyebrow?: string;
  headline?: string;
  lead?: string;
  note?: string;
  formats: { kind?: string; title: string; text?: string; priceFrom?: string }[];
  cta?: { text: string; href: string };
}

export function Theme9ProfessionalPath({
  eyebrow,
  headline,
  lead,
  note,
  formats,
  cta,
}: Theme9ProfessionalPathProps) {
  if (formats.length === 0) return null;

  return (
    <section id="za-salone" className="bg-ee-accent text-ee-canvas">
      <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[110px]">
        <Reveal className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-end gap-6">
          <div className="flex flex-col gap-3">
            {eyebrow && <Eyebrow tone="meadow">{eyebrow}</Eyebrow>}
            {headline && (
              <h2 className="font-newsreader text-[clamp(30px,3.7vw,52px)] leading-[1.05] tracking-[-0.024em]">
                {headline}
              </h2>
            )}
          </div>
          {lead && (
            <p className="font-instrument-sans text-ee-canvas/75 max-w-[48ch] text-[15.5px] leading-[1.7]">
              {lead}
            </p>
          )}
        </Reveal>

        {/* Eksplicitni breakpointi umesto `auto-fit`: na full HD-u su
            veće kartice stale po tri, a dizajn traži četiri. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {formats.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <article className="flex h-full min-h-[280px] flex-col gap-3.5 rounded-[20px] bg-white/[0.08] p-7 transition-colors duration-200 hover:bg-white/[0.13] lg:p-8">
                {f.kind && (
                  <span className="border-ee-accent-contrast/40 text-ee-accent-contrast w-fit rounded-full border px-3.5 py-[5px] text-[11px] tracking-[0.1em] uppercase">
                    {f.kind}
                  </span>
                )}
                <h3 className="font-newsreader text-[26px] leading-snug">
                  {f.title}
                </h3>
                {f.text && (
                  <p className="font-instrument-sans text-ee-canvas/72 text-[15px] leading-[1.7]">
                    {f.text}
                  </p>
                )}
                {f.priceFrom && (
                  <span className="font-newsreader text-ee-accent-contrast mt-auto text-[21px]">
                    {f.priceFrom}
                  </span>
                )}
              </article>
            </Reveal>
          ))}
        </div>

        {(note || cta) && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[color-mix(in_oklab,#c6d5a8_20%,transparent)] pt-6">
            {note && (
              <p className="font-instrument-sans text-ee-canvas/65 max-w-[52ch] text-[13.5px] leading-relaxed">
                {note}
              </p>
            )}
            {cta && (
              <AnchorLink
                href={cta.href}
                className="bg-ee-accent-contrast text-ee-accent hover:bg-ee-meadow-hover inline-flex items-center justify-center rounded-full px-8 py-4 text-[15.5px] font-semibold transition-colors"
              >
                {cta.text}
              </AnchorLink>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
