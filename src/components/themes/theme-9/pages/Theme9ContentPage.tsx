"use client";
/**
 * Theme9ContentPage — render tematske podstranice (`/za-klijente`,
 * `/za-profesionalce`).
 *
 * Obe strane u dizajnu imaju ISTI skelet — PageHero, kartice, numerisani niz,
 * FAQ, završni CTA panel — i razlikuju se samo tonom i tekstom. Zato je ovo
 * jedna komponenta nad `TenantThemePage`, a ne dve skoro identične: „jedan
 * koncept = jedan blok, više izgleda = varijante" (spec §6.7) važi i za strane.
 *
 * Svaka sekcija se preskače kad je sadržaj prazan, pa strana sa polupopunjenim
 * CMS-om ne renderuje prazne ramove.
 */
import { useState } from "react";
import Image from "next/image";
import { AnchorLink } from "../../shared/AnchorLink";
import type { TenantThemePage } from "@/types";
import { Chip, Eyebrow } from "../primitives";
import { Reveal } from "../Reveal";

export interface Theme9ContentPageProps {
  page: TenantThemePage;
  /** Ton PageHero panela — `accent` je forest, `meadow` svetlo zeleni. */
  heroTone?: "accent" | "meadow";
}

export function Theme9ContentPage({
  page,
  heroTone = "meadow",
}: Theme9ContentPageProps) {
  const { hero, cards, steps, faq, cta } = page;
  const darkHero = heroTone === "accent";

  return (
    <>
      {hero && (
        <section className="bg-ee-canvas">
          {/* Isti kontejner kao Header, Footer i sve sekcije ispod: panel se
              poravnava sa ostatkom strane umesto da bude širi od nje. */}
          <div className="mx-auto max-w-[1240px] px-5 pt-6 md:px-8 lg:px-14">
            <Reveal>
              <div
                className={`grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-center gap-8 rounded-3xl px-6 pt-16 pb-10 md:rounded-[32px] md:px-16 md:pt-24 md:pb-14 ${
                  darkHero
                    ? "bg-ee-accent text-ee-canvas"
                    : "bg-ee-surface-muted text-ee-text"
                }`}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4">
                    {hero.eyebrow && (
                      <Eyebrow tone={darkHero ? "meadow" : "coffee"}>
                        {hero.eyebrow}
                      </Eyebrow>
                    )}
                    {hero.headline && (
                      <h1
                        className={`font-newsreader text-[clamp(34px,4.6vw,64px)] leading-[1.02] tracking-[-0.026em] ${darkHero ? "" : "text-ee-accent"}`}
                      >
                        {hero.headline}
                      </h1>
                    )}
                  </div>
                  {hero.lead && (
                    <p
                      className={`font-instrument-sans max-w-[52ch] text-[16.5px] leading-[1.72] ${darkHero ? "text-ee-canvas/80" : "text-ee-text-muted"}`}
                    >
                      {hero.lead}
                    </p>
                  )}
                  {hero.cta && (
                    <AnchorLink
                      href={hero.cta.href}
                      className={`inline-flex w-fit items-center justify-center rounded-full px-8 py-4 text-[15.5px] font-semibold transition-colors ${
                        darkHero
                          ? "bg-ee-accent-contrast text-ee-accent hover:bg-ee-meadow-hover"
                          : "bg-ee-accent text-ee-canvas hover:bg-ee-accent-lift"
                      }`}
                    >
                      {hero.cta.text}
                    </AnchorLink>
                  )}
                  {hero.note && (
                    <p
                      className={`text-[13px] ${darkHero ? "text-ee-canvas/60" : "text-ee-text-muted"}`}
                    >
                      {hero.note}
                    </p>
                  )}
                </div>

                {hero.image?.src && (
                  <div className="relative aspect-square overflow-hidden rounded-3xl">
                    <Image
                      src={hero.image.src}
                      alt={hero.image.alt || hero.headline || ""}
                      fill
                      sizes="(max-width: 768px) 100vw, 45vw"
                      className="object-cover"
                      priority
                    />
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {cards && cards.items.length > 0 && (
        <section className="bg-ee-canvas">
          <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[100px]">
            <SectionHeading heading={cards.heading} />
            <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,265px),1fr))] gap-4">
              {cards.items.map((item, i) => (
                <Reveal key={item.title} delay={i * 60}>
                  <article className="bg-ee-surface border-ee-border hover:border-ee-accent/26 flex h-full flex-col gap-3 rounded-[20px] border p-6 transition-colors">
                    {item.kind && <Chip variant="label">{item.kind}</Chip>}
                    <h3 className="font-newsreader text-ee-accent text-[22px] leading-snug">
                      {item.title}
                    </h3>
                    {item.text && (
                      <p className="font-instrument-sans text-ee-text-muted text-[14.5px] leading-[1.65]">
                        {item.text}
                      </p>
                    )}
                    {item.meta && (
                      <span className="font-newsreader text-ee-accent mt-auto text-[19px]">
                        {item.meta}
                      </span>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {steps && steps.items.length > 0 && (
        <section className="bg-ee-surface">
          <div className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20 lg:px-14 lg:py-[100px]">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-8 lg:gap-[72px]">
              <SectionHeading heading={steps.heading} />

              <ol className="flex flex-col">
                {steps.items.map((item, i) => (
                  <li key={item.title}>
                    <Reveal
                      delay={i * 60}
                      className="border-ee-border grid grid-cols-[52px_minmax(0,1fr)_auto] items-start gap-4 border-b py-6 last:border-b-0"
                    >
                      <span className="font-newsreader text-ee-sage text-[19px]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex flex-col gap-1.5">
                        <span className="font-newsreader text-ee-accent text-[20px] leading-snug">
                          {item.title}
                        </span>
                        {item.text && (
                          <span className="font-instrument-sans text-ee-text-muted text-[14.5px] leading-[1.65]">
                            {item.text}
                          </span>
                        )}
                        {item.points && item.points.length > 0 && (
                          <span className="mt-1 flex flex-col gap-1">
                            {item.points.map((pt) => (
                              <span
                                key={pt}
                                className="text-ee-text-muted flex gap-2 text-[14px]"
                              >
                                <span className="text-ee-terracotta" aria-hidden>
                                  —
                                </span>
                                {pt}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      {item.meta && (
                        <span className="text-ee-text-muted text-[12.5px] whitespace-nowrap">
                          {item.meta}
                        </span>
                      )}
                    </Reveal>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}

      {faq && faq.items.length > 0 && (
        <section className="bg-ee-canvas">
          <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-8 px-5 py-14 md:px-8 md:py-20 lg:gap-[72px] lg:px-14 lg:py-[100px]">
            {faq.image?.src && (
              <Reveal className="relative aspect-[3/4] overflow-hidden rounded-3xl">
                <Image
                  src={faq.image.src}
                  alt={faq.image.alt || ""}
                  fill
                  sizes="(max-width: 768px) 100vw, 45vw"
                  className="object-cover"
                />
              </Reveal>
            )}

            <div className="flex flex-col gap-5">
              <SectionHeading heading={faq.heading} />
              <Accordion items={faq.items} />
            </div>
          </div>
        </section>
      )}

      {cta && (cta.headline || cta.cta) && (
        <section className="bg-ee-canvas">
          <div className="mx-auto max-w-[1240px] px-5 pb-14 md:px-8 md:pb-20 lg:px-14 lg:pb-[100px]">
            <Reveal>
              <div
                className={`flex flex-wrap items-center justify-between gap-6 rounded-[28px] p-8 md:p-12 lg:p-[68px] ${
                  cta.tone === "warm"
                    ? "bg-ee-terracotta text-ee-text"
                    : "bg-ee-accent text-ee-canvas"
                }`}
              >
                <div className="flex max-w-[46ch] flex-col gap-3">
                  {cta.headline && (
                    <h2 className="font-newsreader text-[clamp(28px,3.4vw,44px)] leading-[1.06] tracking-[-0.024em]">
                      {cta.headline}
                    </h2>
                  )}
                  {cta.lead && (
                    <p
                      className={`font-instrument-sans text-[15.5px] leading-[1.7] ${cta.tone === "warm" ? "text-ee-text/75" : "text-ee-canvas/75"}`}
                    >
                      {cta.lead}
                    </p>
                  )}
                </div>
                {cta.cta && (
                  <AnchorLink
                    href={cta.cta.href}
                    className={`inline-flex items-center justify-center rounded-full px-8 py-4 text-[15.5px] font-semibold transition-colors ${
                      cta.tone === "warm"
                        ? "bg-ee-accent text-ee-canvas hover:bg-ee-accent-lift"
                        : "bg-ee-accent-contrast text-ee-accent hover:bg-ee-meadow-hover"
                    }`}
                  >
                    {cta.cta.text}
                  </AnchorLink>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}

function SectionHeading({
  heading,
}: {
  heading?: { eyebrow?: string; headline?: string; lead?: string };
}) {
  if (!heading || (!heading.eyebrow && !heading.headline && !heading.lead)) {
    return null;
  }
  return (
    <Reveal className="flex max-w-[46ch] flex-col gap-3">
      <div className="flex flex-col gap-4">
        {heading.eyebrow && <Eyebrow>{heading.eyebrow}</Eyebrow>}
        {heading.headline && (
          <h2 className="font-newsreader text-ee-accent text-[clamp(30px,3.7vw,52px)] leading-[1.05] tracking-[-0.024em]">
            {heading.headline}
          </h2>
        )}
      </div>
      {heading.lead && (
        <p className="font-instrument-sans text-ee-text-muted text-[16px] leading-[1.72]">
          {heading.lead}
        </p>
      )}
    </Reveal>
  );
}

function Accordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openId, setOpenId] = useState(0);

  return (
    <div className="border-ee-border border-t">
      {items.map((item, i) => {
        const open = openId === i;
        return (
          <div key={item.question} className="border-ee-border border-b">
            <button
              type="button"
              onClick={() => setOpenId(open ? -1 : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 py-7 text-left"
            >
              <span className="font-newsreader text-ee-accent text-[19px] leading-snug">
                {item.question}
              </span>
              <span
                aria-hidden
                className={`border-ee-border text-ee-accent flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border transition-all duration-300 ${
                  open ? "bg-ee-accent-contrast/40 rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>
            {open && (
              <p className="font-instrument-sans text-ee-text-muted max-w-[64ch] pb-7 text-[15px] leading-[1.72]">
                {item.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
