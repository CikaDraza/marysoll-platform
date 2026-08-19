/**
 * Theme9About — biografija levo, portret 3:4 desno sa pull-quote karticom.
 *
 * Kredencijali su „rows" tabela iz teme: samo horizontalne linije, bez vertikalnih.
 */
import Image from "next/image";
import { Eyebrow } from "./primitives";

/** Monogram kad logo nije postavljen. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}
import { Reveal } from "./Reveal";

export interface Theme9AboutProps {
  eyebrow?: string;
  headline: string;
  paragraphs: string[];
  credentials: { label: string; value: string; note?: string }[];
  /** Vizit-kartica u donjem desnom uglu slike: logo/monogram, ime, uloga. */
  badge?: { logo?: string; name: string; role?: string };
  image?: { url: string; alt?: string };
}

export function Theme9About({
  eyebrow,
  headline,
  paragraphs,
  credentials,
  badge,
  image,
}: Theme9AboutProps) {
  return (
    <section id="o-meni" className="bg-ee-surface">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-center gap-9 px-5 py-14 md:px-8 md:py-20 lg:gap-[84px] lg:px-14 lg:py-[110px]">
        <Reveal className="flex flex-col gap-[30px]">
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
            <dl className="border-ee-border mt-2 flex flex-col border-t">
              {credentials.map((c) => (
                <div
                  key={c.label}
                  className="border-ee-border grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-5 gap-y-2 border-b py-5"
                >
                  <dt className="text-ee-sage text-[11px] tracking-[0.14em] uppercase">
                    {c.label}
                  </dt>
                  <dd className="flex flex-col gap-0.5">
                    <span className="text-ee-text text-[15px] leading-[1.6]">
                      {c.value}
                    </span>
                    {c.note && (
                      <span className="text-ee-text-muted text-[13px] leading-[1.5]">
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

            {badge && (
              <div className="bg-ee-surface absolute -right-2.5 -bottom-[18px] flex items-center gap-3 rounded-2xl px-4 py-3 shadow-[0_10px_30px_rgba(58,46,40,0.14)]">
                {badge.logo ? (
                  <Image
                    src={badge.logo}
                    alt={badge.name}
                    width={38}
                    height={38}
                    className="h-[38px] w-[38px] flex-none rounded-full object-cover"
                  />
                ) : (
                  <span className="bg-ee-accent text-ee-canvas font-newsreader flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[15px]">
                    {initialsOf(badge.name)}
                  </span>
                )}
                <span className="flex flex-col leading-tight">
                  <span className="font-newsreader text-ee-accent text-[15px]">
                    {badge.name}
                  </span>
                  {badge.role && (
                    <span className="text-ee-text-muted text-[11.5px]">
                      {badge.role}
                    </span>
                  )}
                </span>
              </div>
            )}
          </Reveal>
        )}
      </div>
    </section>
  );
}
