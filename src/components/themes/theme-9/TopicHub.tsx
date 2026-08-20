"use client";
/**
 * Theme9TopicHub — filtrirana lista stručnih tema.
 *
 * Filter je jedini interaktivni deo teme koji drži stanje. Kad filter nije
 * izabran (ili ga uopšte nema), prikazuju se sve teme — bez JS-a lista ostaje
 * potpuna, ne prazna.
 */
import { useState } from "react";
import { AnchorLink } from "../shared/AnchorLink";
import { ArrowCircle, Chip, Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9TopicHubProps {
  eyebrow?: string;
  headline?: string;
  filters: { id: string; label: string }[];
  topics: {
    id: string;
    group?: string;
    title: string;
    lead?: string;
    tags: string[];
    href?: string;
  }[];
}

const ALL = "__sve__";

export function Theme9TopicHub({
  eyebrow,
  headline,
  filters,
  topics,
}: Theme9TopicHubProps) {
  const [active, setActive] = useState(ALL);

  if (topics.length === 0) return null;

  const visible =
    active === ALL ? topics : topics.filter((t) => t.group === active);

  return (
    <section id="teme" className="bg-ee-canvas">
      <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[110px]">
        <Reveal className="mb-9 flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-end">
          {/* `min-w-0` + `basis` — naslov se prelama u nov red umesto da
              stisne tabove; tabovi ispod imaju `shrink-0`. */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {headline && (
              <h2 className="font-newsreader text-ee-accent max-w-[46ch] text-[clamp(30px,3.7vw,52px)] leading-[1.05] tracking-[-0.024em]">
                {headline}
              </h2>
            )}
          </div>

          {filters.length > 0 && (
            <div className="flex shrink-0 flex-wrap gap-2 lg:flex-nowrap">
              {[{ id: ALL, label: "Sve" }, ...filters].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActive(f.id)}
                  aria-pressed={active === f.id}
                  className={`rounded-full border px-4 py-2 text-[13.5px] transition-colors ${
                    active === f.id
                      ? "border-ee-text bg-ee-text text-ee-canvas"
                      : "border-ee-border text-ee-text-muted hover:border-ee-accent/40"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </Reveal>

        <ul className="flex flex-col">
          {visible.map((topic, i) => {
            const row = (
              <>
                <span className="font-newsreader text-ee-sage text-[22px] leading-none">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="flex flex-col gap-2">
                  <span className="font-newsreader text-ee-accent text-[clamp(20px,2.2vw,27px)] leading-snug">
                    {topic.title}
                  </span>
                  {topic.lead && (
                    <span className="font-instrument-sans text-ee-text-muted max-w-[60ch] text-[15px] leading-[1.7]">
                      {topic.lead}
                    </span>
                  )}
                  {topic.tags.length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-2">
                      {topic.tags.map((t) => (
                        <Chip key={t} variant="tagOutlined">
                          {t}
                        </Chip>
                      ))}
                    </span>
                  )}
                </span>

                {topic.href && <ArrowCircle size={44} />}
              </>
            );

            const cls =
              "border-ee-border hover:bg-ee-surface grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-4 border-b px-1.5 py-6 transition-colors lg:gap-10 lg:py-8";

            return (
              <li key={topic.id}>
                {topic.href ? (
                  <AnchorLink href={topic.href} className={`group ${cls}`}>
                    {row}
                  </AnchorLink>
                ) : (
                  <div className={cls}>{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
