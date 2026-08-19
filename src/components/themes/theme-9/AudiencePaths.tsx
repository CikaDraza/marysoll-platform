/**
 * Theme9AudiencePaths — dve putanje: „za tebe lično" i „za tvoj tim".
 * Druga kartica je tamna (forest) sa dekorativnim krugom, po prototipu.
 */
import { AnchorLink } from "../shared/AnchorLink";
import { Chip, Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9AudiencePathsProps {
  eyebrow?: string;
  /** Naslov levo. */
  headline?: string;
  /** Rečenica desno, uz naslov. */
  lead?: string;
  paths: {
    id: string;
    chip?: string;
    title: string;
    lead?: string;
    bullets: string[];
    href?: string;
    /** Tekst dugmeta („Za klijente"); bez njega se CTA ne renderuje. */
    ctaLabel?: string;
    tone?: "surface" | "accent";
  }[];
}

export function Theme9AudiencePaths({
  eyebrow,
  headline,
  lead,
  paths,
}: Theme9AudiencePathsProps) {
  if (paths.length === 0) return null;

  return (
    <section id="staze" className="bg-ee-canvas">
      <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[110px]">
        {(eyebrow || headline || lead) && (
          <Reveal className="mb-9 flex flex-wrap items-baseline justify-between gap-4">
            <div className="flex flex-col gap-2">
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              {headline && (
                <h2 className="font-newsreader text-ee-accent text-[clamp(26px,3vw,40px)] leading-[1.06] tracking-[-0.02em]">
                  {headline}
                </h2>
              )}
            </div>
            {lead && (
              <p className="font-instrument-sans text-ee-text-muted max-w-[46ch] text-[13.5px] leading-relaxed">
                {lead}
              </p>
            )}
          </Reveal>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))] gap-4 lg:gap-[26px]">
          {paths.map((path, i) => {
            const dark = path.tone === "accent";
            return (
              <Reveal key={path.id} delay={i * 70}>
                <article
                  className={`relative flex h-full flex-col gap-4 overflow-hidden rounded-[20px] p-7 transition-colors duration-200 lg:p-10 ${
                    dark
                      ? "bg-ee-accent text-ee-canvas"
                      : "bg-ee-surface border-ee-border hover:border-ee-accent/30 border"
                  }`}
                >
                  {dark && (
                    <span
                      aria-hidden
                      className="bg-ee-accent-soft/40 absolute -top-[60px] -right-[60px] h-[220px] w-[220px] rounded-full"
                    />
                  )}

                  {/* Broj levo, oznaka skroz desno — `justify-between`, po dizajnu. */}
                  <div className="relative flex items-start justify-between gap-4">
                    <span
                      className={`font-newsreader text-[34px] leading-none ${dark ? "text-ee-accent-contrast/70" : "text-ee-sage"}`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {path.chip &&
                      (dark ? (
                        <span className="border-ee-accent-contrast/40 text-ee-accent-contrast rounded-full border px-3.5 py-[5px] text-[11px] tracking-[0.1em] uppercase">
                          {path.chip}
                        </span>
                      ) : (
                        <Chip variant="label">{path.chip}</Chip>
                      ))}
                  </div>

                  <h3
                    className={`font-newsreader relative text-[clamp(28px,3vw,40px)] leading-tight ${dark ? "text-ee-canvas" : "text-ee-accent"}`}
                  >
                    {path.title}
                  </h3>

                  {path.lead && (
                    <p
                      className={`font-instrument-sans relative max-w-[38ch] text-[15.5px] leading-[1.7] ${dark ? "text-ee-canvas/80" : "text-ee-text-muted"}`}
                    >
                      {path.lead}
                    </p>
                  )}

                  {path.bullets.length > 0 && (
                    <ul className="relative flex flex-col gap-2">
                      {path.bullets.map((b) => (
                        <li
                          key={b}
                          className={`flex items-start gap-2.5 text-[14.5px] ${dark ? "text-ee-canvas/75" : "text-ee-text-muted"}`}
                        >
                          <span
                            aria-hidden
                            className={`mt-[7px] h-[5px] w-[5px] flex-none rounded-full ${dark ? "bg-ee-accent-contrast" : "bg-ee-terracotta"}`}
                          />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {path.href && path.ctaLabel && (
                    <div className="relative mt-auto pt-2">
                      <AnchorLink
                        href={path.href}
                        className={`font-instrument-sans inline-flex items-center gap-3 text-[14.5px] font-semibold ${dark ? "text-white" : "text-ee-accent"}`}
                      >
                        {path.ctaLabel}
                        <span
                          aria-hidden
                          className={`flex h-[34px] w-[34px] items-center justify-center rounded-full text-[14px] ${
                            dark
                              ? "bg-ee-accent-contrast/24 text-ee-accent-contrast"
                              : "bg-ee-accent-contrast text-ee-accent"
                          }`}
                        >
                          →
                        </span>
                      </AnchorLink>
                    </div>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
