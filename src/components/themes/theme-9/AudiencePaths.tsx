/**
 * Theme9AudiencePaths — dve putanje: „za tebe lično" i „za tvoj tim".
 * Druga kartica je tamna (forest) sa dekorativnim krugom, po prototipu.
 */
import { AnchorLink } from "../shared/AnchorLink";
import { ArrowCircle, Chip, Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9AudiencePathsProps {
  eyebrow?: string;
  headline?: string;
  paths: {
    id: string;
    chip?: string;
    title: string;
    lead?: string;
    bullets: string[];
    href?: string;
    tone?: "surface" | "accent";
  }[];
}

export function Theme9AudiencePaths({
  eyebrow,
  headline,
  paths,
}: Theme9AudiencePathsProps) {
  if (paths.length === 0) return null;

  return (
    <section id="staze" className="bg-ee-canvas">
      <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[110px]">
        {(eyebrow || headline) && (
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {headline && (
              <p className="font-instrument-sans text-ee-text-muted max-w-[46ch] text-[15.5px] leading-relaxed">
                {headline}
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

                  <div className="relative flex items-center gap-3">
                    <span
                      className={`font-newsreader text-[34px] leading-none ${dark ? "text-ee-accent-contrast" : "text-ee-sage"}`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {path.chip && (
                      <Chip variant={dark ? "tagOutlined" : "tag"}>
                        {path.chip}
                      </Chip>
                    )}
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
                            className={`mt-2 h-[5px] w-[5px] flex-none rounded-full ${dark ? "bg-ee-accent-contrast" : "bg-ee-sage"}`}
                          />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {path.href && (
                    <AnchorLink
                      href={path.href}
                      className="group relative mt-auto inline-flex w-fit items-center gap-2 pt-2"
                      aria-label={path.title}
                    >
                      <ArrowCircle size={34} />
                    </AnchorLink>
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
