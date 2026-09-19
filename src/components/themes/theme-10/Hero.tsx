/**
 * Theme10Hero — `#pocetna`. Levo tekst, desno portret (izrezan PNG sa
 * providnom pozadinom) koji stoji na donjoj ivici sekcije, preko srebrnog
 * gradijenta.
 *
 * CMS: eyebrow, headline (novi red = prelom), subheadline, CTA dugmad i slika.
 * Prazna polja padaju na tekst i sliku iz dizajna.
 */
import { BookLink } from "./BookLink";
import { EASE, FOCUS_RING, THEME10_ANCHORS } from "./constants";

export interface Theme10HeroProps {
  eyebrow: string;
  headlineLines: string[];
  subheadline: string;
  primaryCta: { text: string; href: string };
  secondaryCta: { text: string; href: string };
  image: { src: string; alt: string };
}

export function Theme10Hero({
  eyebrow,
  headlineLines,
  subheadline,
  primaryCta,
  secondaryCta,
  image,
}: Theme10HeroProps) {
  return (
    <section
      id={THEME10_ANCHORS.home}
      className="grid grid-cols-1 overflow-hidden border-b border-ash-ink/8 bg-[linear-gradient(135deg,#eceae7_0%,#dedcd8_42%,#c9c7c3_100%)] min-[881px]:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
    >
      <div className="flex flex-col justify-center gap-[clamp(20px,2.4vw,34px)] pt-[clamp(48px,6vw,104px)] pr-[clamp(20px,3vw,44px)] pl-[clamp(20px,4vw,64px)] min-[881px]:pb-[clamp(48px,6vw,104px)]">
        <div className="flex items-center gap-3.5">
          <span className="h-px w-[38px] bg-ash-gold" />
          <span className="text-[11px] uppercase tracking-[0.34em] text-ash-ink-faint">
            {eyebrow}
          </span>
        </div>
        <h1 className="font-cormorant text-[clamp(44px,6.4vw,96px)] font-normal leading-[0.96] tracking-[-0.01em] text-balance">
          {headlineLines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="max-w-[34ch] text-[clamp(15px,1.15vw,18px)] font-light leading-[1.65] text-ash-ink-soft">
          {subheadline}
        </p>
        <div className="flex flex-wrap items-center gap-3.5">
          <BookLink
            href={primaryCta.href}
            className={`inline-flex items-center gap-3.5 rounded-full bg-ash-ink px-8 py-[18px] text-[12px] uppercase tracking-[0.2em] text-ash-paper-2 hover:bg-ash-gold hover:text-white ${EASE} ${FOCUS_RING}`}
          >
            {primaryCta.text} <span aria-hidden>→</span>
          </BookLink>
          <a
            href={secondaryCta.href}
            className={`inline-flex items-center gap-2.5 border-b border-ash-ink/25 px-[26px] py-[18px] text-[12px] uppercase tracking-[0.2em] text-ash-ink-soft hover:border-ash-gold hover:text-ash-gold ${EASE} ${FOCUS_RING}`}
          >
            {secondaryCta.text}
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-[clamp(14px,2vw,26px)] pt-[clamp(12px,2vw,26px)] text-[11px] uppercase tracking-[0.28em] text-ash-ink-faint">
          <span>Higijena</span>
          <span className="text-ash-gold" aria-hidden>
            /
          </span>
          <span>Estetika</span>
          <span className="text-ash-gold" aria-hidden>
            /
          </span>
          <span>Poverenje</span>
        </div>
      </div>

      {/* Portret: negativna desna margina pušta figuru da „izađe" iz kolone
          kao u dizajnu; na mobilnom se vraća u kolonu. */}
      <div className="relative min-h-[clamp(340px,72vw,520px)] overflow-hidden min-[881px]:mr-[-14vw] min-[881px]:min-h-[clamp(420px,52vw,760px)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- providni PNG/WebP iz CMS-a, proizvoljan domen */}
        <img
          src={image.src}
          alt={image.alt}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-contain object-bottom"
        />
        <div
          aria-hidden
          className="absolute top-[clamp(28px,5vw,70px)] right-[clamp(16px,3vw,44px)] text-center font-parisienne text-[clamp(28px,3.4vw,52px)] leading-[1.15] text-[#9c7c3e] [text-shadow:0_1px_14px_rgba(255,255,255,0.35)] min-[881px]:right-[calc(14vw+clamp(16px,3vw,44px))]"
        >
          More
          <br />
          than
          <br />
          nails
        </div>
        <div className="absolute right-[calc(14vw+clamp(16px,3vw,44px))] bottom-[clamp(24px,4vw,56px)] hidden border-l border-ash-ink/30 pl-[18px] text-left text-[11px] uppercase leading-[2.1] tracking-[0.26em] text-[#3a3936] min-[881px]:block">
          Zdravo
          <br />
          uređeno
          <br />
          sigurno
        </div>
      </div>
    </section>
  );
}
