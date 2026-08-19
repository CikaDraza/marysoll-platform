/**
 * Theme9FeaturedEducation — istaknuta edukacija, forest panel.
 *
 * Svaki detalj koji nije potvrđen prikazuje `pendingLabel` umesto vrednosti —
 * sekcija sme da postoji i pre nego što format, termin i cena budu poznati.
 * Zato je ovo `content.*` teaser, a ne domenski `education.*` blok.
 */
import { AnchorLink } from "../shared/AnchorLink";
import { Chip, Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9FeaturedEducationProps {
  eyebrow?: string;
  status?: string;
  headline?: string;
  lead?: string;
  learn: string[];
  details: { label: string; value?: string }[];
  pendingLabel: string;
  cta?: { text: string; href: string };
  note?: string;
}

export function Theme9FeaturedEducation({
  eyebrow,
  status,
  headline,
  lead,
  learn,
  details,
  pendingLabel,
  cta,
  note,
}: Theme9FeaturedEducationProps) {
  if (!headline && learn.length === 0) return null;

  return (
    <section id="online-edukacija" className="bg-ee-canvas">
      <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[110px]">
        <Reveal>
          <div className="bg-ee-accent text-ee-canvas grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-8 rounded-[28px] p-8 md:p-12 lg:p-[60px]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3">
                {eyebrow && <Eyebrow tone="meadow">{eyebrow}</Eyebrow>}
                {status && <Chip variant="tagOutlined">{status}</Chip>}
              </div>

              {headline && (
                <h2 className="font-newsreader max-w-[24ch] text-[clamp(30px,3.7vw,50px)] leading-[1.05] tracking-[-0.024em]">
                  {headline}
                </h2>
              )}

              {lead && (
                <p className="font-instrument-sans text-ee-canvas/80 max-w-[52ch] text-[16px] leading-[1.72]">
                  {lead}
                </p>
              )}

              {learn.length > 0 && (
                <ul className="flex flex-col gap-2.5">
                  {learn.map((item) => (
                    <li
                      key={item}
                      className="text-ee-canvas/75 flex items-start gap-2.5 text-[14.5px]"
                    >
                      <span
                        aria-hidden
                        className="bg-ee-accent-contrast mt-2 h-[5px] w-[5px] flex-none rounded-full"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-5 rounded-[22px] bg-white/[0.09] p-6">
              <dl className="flex flex-col">
                {details.map((d) => (
                  <div
                    key={d.label}
                    className="flex items-baseline justify-between gap-4 border-b border-white/10 py-3 last:border-b-0"
                  >
                    <dt className="text-ee-canvas/60 text-[12.5px] tracking-[0.1em] uppercase">
                      {d.label}
                    </dt>
                    <dd
                      className={`text-[14.5px] ${d.value ? "text-ee-canvas" : "text-ee-canvas/55 italic"}`}
                    >
                      {d.value || pendingLabel}
                    </dd>
                  </div>
                ))}
              </dl>

              {cta && (
                <AnchorLink
                  href={cta.href}
                  className="bg-ee-accent-contrast text-ee-accent hover:bg-ee-meadow-hover inline-flex items-center justify-center rounded-full px-8 py-4 text-[15.5px] font-semibold transition-colors"
                >
                  {cta.text}
                </AnchorLink>
              )}

              {note && (
                <p className="text-ee-canvas/55 text-[12.5px] leading-relaxed">
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
