/**
 * Theme9Hero — editorial hero: tekst levo, portret 4:5 desno sa lebdećim badge-om.
 *
 * Primarni CTA je LAUNCHER, ne sekcija (spec 6.11). Kad tenant NIJE sam upisao
 * href, dugme je inertno (`BookingCta`) — namerno bez fallbacka na `/termini`,
 * jer je to salonski Service Booking, a Consultation je zaseban domen.
 */
import Image from "next/image";
import { AnchorLink } from "../shared/AnchorLink";
import { BookingCta } from "./BookingCta";
import { ArrowCircle, Eyebrow } from "./primitives";
import { Reveal } from "./Reveal";

export interface Theme9HeroProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  keywords: string[];
  /** `href` postoji samo kad ga je tenant sam upisao; inače je CTA inertan. */
  primaryCta: { text: string; href?: string };
  secondaryCta?: { text: string; href: string };
  image?: { url: string; alt?: string };
  /** Citat u uglu slike. Vizit-kartica sa imenom je na About slici. */
  quote?: string;
}

export function Theme9Hero({
  eyebrow,
  title,
  lead,
  keywords,
  primaryCta,
  secondaryCta,
  image,
  quote,
}: Theme9HeroProps) {
  return (
    <section id="hero" className="bg-ee-canvas">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-8 px-5 py-14 md:px-8 md:py-20 lg:gap-[72px] lg:px-14 lg:py-[110px]">
        <Reveal className="flex flex-col gap-6">
          {eyebrow && (
            <span className="bg-ee-surface border-ee-border inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5">
              <span className="bg-ee-sage h-1.5 w-1.5 rounded-full" aria-hidden />
              <Eyebrow>{eyebrow}</Eyebrow>
            </span>
          )}

          <h1 className="font-newsreader text-ee-accent text-[clamp(40px,5.6vw,78px)] leading-none tracking-[-0.028em]">
            {title}
          </h1>

          {lead && (
            <p className="font-instrument-sans text-ee-text-muted max-w-[52ch] text-[17.5px] leading-[1.72]">
              {lead}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {primaryCta.href ? (
              <AnchorLink
                href={primaryCta.href}
                className="group bg-ee-accent hover:bg-ee-accent-lift text-ee-canvas inline-flex items-center gap-3 rounded-full py-2 pr-6 pl-2 text-[14.5px] font-semibold transition-colors duration-[250ms]"
              >
                <ArrowCircle size={36} />
                {primaryCta.text}
              </AnchorLink>
            ) : (
              <BookingCta
                label={primaryCta.text}
                className="py-2 pr-6 pl-2 text-[14.5px]"
              />
            )}

            {secondaryCta && (
              <AnchorLink
                href={secondaryCta.href}
                className="font-instrument-sans text-ee-accent text-[14.5px] underline underline-offset-[5px] hover:no-underline"
              >
                {secondaryCta.text}
              </AnchorLink>
            )}
          </div>

          {keywords.length > 0 && (
            <ul className="text-ee-text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              {keywords.map((kw, i) => (
                <li key={kw} className="flex items-center gap-3">
                  {i > 0 && <span aria-hidden>·</span>}
                  <span>{kw}</span>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        {image?.url && (
          <Reveal delay={80} className="relative">
            <div className="bg-ee-surface-muted relative aspect-[4/5] overflow-hidden rounded-[28px]">
              <Image
                src={image.url}
                alt={image.alt || ""}
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover transition-transform duration-[600ms] ease-out hover:scale-[1.02]"
                priority
              />
            </div>

            {quote && (
              <blockquote className="bg-ee-surface-muted border-ee-border pointer-events-none absolute -bottom-[18px] -left-2.5 max-w-[250px] rounded-[18px] border px-5 py-4">
                <p className="font-newsreader text-ee-accent text-[17px] leading-[1.35]">
                  {`„${quote}“`}
                </p>
              </blockquote>
            )}
          </Reveal>
        )}
      </div>
    </section>
  );
}
