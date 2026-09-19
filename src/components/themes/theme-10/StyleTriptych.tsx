/**
 * Theme10StyleTriptych — `#stil`, prikaz `content.about` bloka:
 * foto | tekst | foto.
 *
 * CMS: about.headline (novi red = prelom), prvi pasus i do dve slike
 * (`about.images`, pa `about.image`). Prazno pada na dizajn.
 *
 * Dugme ispod teksta je slot kompozicije: blok ne zna da li galerija postoji
 * na strani, pa mu landing predaje gotovo dugme (link na galeriju ili CTA).
 */
import type { ReactNode } from "react";
import { THEME10_ANCHORS } from "./constants";

export interface Theme10StyleTriptychProps {
  headlineLines: string[];
  body: string;
  leftImage: { src: string; alt: string };
  rightImage: { src: string; alt: string };
}

export function Theme10StyleTriptych({
  headlineLines,
  body,
  leftImage,
  rightImage,
  action,
}: Theme10StyleTriptychProps & { action?: ReactNode }) {
  return (
    <section
      id={THEME10_ANCHORS.style}
      className="grid grid-cols-1 min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      <div className="relative min-h-[clamp(300px,34vw,520px)] overflow-hidden bg-[#2a1414]">
        {/* eslint-disable-next-line @next/next/no-img-element -- CMS slika, proizvoljan domen */}
        <img
          src={leftImage.src}
          alt={leftImage.alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-[45%_50%]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(20,19,18,0.7)_0%,rgba(20,19,18,0)_100%)] px-[clamp(16px,2vw,32px)] pt-[clamp(32px,5vw,64px)] pb-[clamp(20px,2.6vw,40px)] font-parisienne text-[clamp(24px,2.4vw,38px)] leading-[1.25] text-ash-paper-2"
        >
          Detalji
          <br />
          čine razliku.
        </div>
      </div>

      <div className="flex flex-col justify-center gap-6 bg-ash-paper-3 px-[clamp(24px,3.6vw,64px)] py-[clamp(40px,5vw,80px)]">
        <h2 className="font-cormorant text-[clamp(32px,3.6vw,56px)] font-normal uppercase leading-[1.02]">
          {headlineLines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h2>
        <span className="h-px w-14 bg-ash-gold" />
        <p className="max-w-[38ch] text-base font-light leading-[1.75] text-ash-ink-soft">
          {body}
        </p>
        {action}
      </div>

      <div className="relative min-h-[clamp(300px,34vw,520px)] overflow-hidden bg-[#e3ded9]">
        {/* eslint-disable-next-line @next/next/no-img-element -- CMS slika, proizvoljan domen */}
        <img
          src={rightImage.src}
          alt={rightImage.alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-[45%_45%]"
        />
        {/* Puna ploča, ne gradijent: foto je svetao i pun detalja. */}
        <div className="absolute right-[clamp(14px,1.8vw,28px)] bottom-[clamp(20px,2.6vw,40px)] bg-[rgba(20,19,18,0.84)] px-[18px] py-3.5 text-right text-[10.5px] uppercase leading-[2.2] tracking-[0.26em] text-white">
          Klasično
          <br />
          Moderno
          <br />
          Minimalno
          <br />
          Uvek elegantno
        </div>
      </div>
    </section>
  );
}
