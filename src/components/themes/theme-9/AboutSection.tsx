/**
 * Theme9About — biografija levo, portret 3:4 desno sa pull-quote karticom.
 *
 * Kredencijali su „rows" tabela iz teme: samo horizontalne linije, bez vertikalnih.
 */
import Image from "next/image";
import { Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9AboutProps {
  eyebrow?: string;
  headline: string;
  paragraphs: string[];
  credentials: { label: string; value: string; note?: string }[];
  pullQuote?: string;
  image?: { url: string; alt?: string };
}

export function Theme9About({
  eyebrow,
  headline,
  paragraphs,
  credentials,
  pullQuote,
  image,
}: Theme9AboutProps) {
  return (
    <section id="o-meni" className="bg-ee-surface">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-center gap-9 px-5 py-14 md:px-8 md:py-20 lg:gap-[84px] lg:px-14 lg:py-[110px]">
        <Reveal className="flex flex-col gap-5">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}

          <h2 className="font-newsreader text-ee-accent text-[clamp(30px,3.7vw,52px)] leading-[1.05] tracking-[-0.024em]">
            {headline}
          </h2>

          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="font-instrument-sans text-ee-text-muted max-w-[50ch] text-[17px] leading-[1.75]"
            >
              {p}
            </p>
          ))}

          {credentials.length > 0 && (
            <dl className="mt-2 flex flex-col">
              {credentials.map((c) => (
                <div
                  key={c.label}
                  className="border-ee-border grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2 border-b py-4 last:border-b-0"
                >
                  <dt className="text-ee-sage text-[11px] tracking-[0.14em] uppercase">
                    {c.label}
                  </dt>
                  <dd className="flex flex-col">
                    <span className="text-ee-text text-[15px]">{c.value}</span>
                    {c.note && (
                      <span className="text-ee-text-muted text-[13px]">
                        {c.note}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Reveal>

        {image?.url && (
          <Reveal delay={80} className="relative">
            <div className="bg-ee-surface-muted relative aspect-[3/4] overflow-hidden rounded-[28px]">
              <Image
                src={image.url}
                alt={image.alt || ""}
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover transition-transform duration-[600ms] ease-out hover:scale-[1.02]"
              />
            </div>

            {pullQuote && (
              <blockquote className="bg-ee-surface -right-2.5 -bottom-[18px] max-w-[250px] rounded-[18px] px-5 py-4 shadow-[0_14px_34px_rgba(58,46,40,0.1)] md:absolute">
                <p className="font-newsreader text-ee-accent text-[17px] leading-snug">
                  {pullQuote}
                </p>
              </blockquote>
            )}
          </Reveal>
        )}
      </div>
    </section>
  );
}
