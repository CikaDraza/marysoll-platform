/**
 * Theme10Hero — `#pocetna`. Levo tekst, desno portret (izrezan PNG sa
 * providnom pozadinom) koji stoji na donjoj ivici sekcije, preko srebrnog
 * gradijenta.
 *
 * CMS: eyebrow, headline (novi red = prelom), subheadline, CTA dugmad i slika.
 * Prazna polja padaju na tekst i sliku iz dizajna.
 */
import { BookLink } from "./BookLink";
import { CONTENT_WIDTH, EASE, FOCUS_RING, THEME10_ANCHORS } from "./constants";

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
      className="relative isolate overflow-hidden border-b border-ash-ink/8 bg-[linear-gradient(135deg,#eceae7_0%,#dedcd8_42%,#c9c7c3_100%)] pb-[50px] min-[881px]:pb-0"
    >
      {/* Tamni kraj hero-a daje portretu dubinu, a zlatnom potpisu kontrast.
          Aurora ostaje vrlo suptilna: svetlo dolazi iz srebrne pozadine, pa
          ne uvodi novu boju van Ash Studio palete. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(105deg,rgba(236,234,231,0)_0%,rgba(236,234,231,0)_34%,rgba(130,126,121,0.08)_50%,rgba(76,73,69,0.28)_65%,rgba(28,27,26,0.76)_82%,#000_100%)] min-[881px]:bg-[linear-gradient(105deg,rgba(236,234,231,0)_0%,rgba(236,234,231,0)_43%,rgba(88,85,81,0.14)_55%,rgba(28,27,26,0.76)_75%,#000_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-[24%] right-[-28%] h-[82%] w-[120%] rotate-[-18deg] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(190,153,81,0.25)_0%,rgba(118,111,103,0.16)_34%,transparent_70%)] blur-3xl" />
        <div className="absolute bottom-[-42%] right-[-12%] h-[88%] w-[108%] rotate-[22deg] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(190,153,81,0.16)_0%,rgba(255,255,255,0.08)_28%,transparent_68%)] blur-3xl" />
      </div>

      <div className={`${CONTENT_WIDTH} relative z-10 flex flex-row`}>
      <div className="relative z-10 flex w-[65%] flex-none self-start flex-col justify-center gap-[clamp(20px,2.4vw,34px)] pt-[calc(70px+clamp(48px,6vw,104px))] pr-[clamp(20px,3vw,44px)] pl-[clamp(20px,4vw,64px)] min-[881px]:w-[55%] min-[881px]:self-auto min-[881px]:pt-[calc(80px+clamp(48px,6vw,104px))] min-[881px]:pb-[clamp(48px,6vw,104px)]">
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
            className={`inline-flex items-center gap-3.5 rounded-full bg-ash-ink px-8 py-[18px] text-[10px] uppercase tracking-[0.2em] text-ash-paper-2 hover:bg-ash-gold hover:text-white ${EASE} ${FOCUS_RING}`}
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

      {/* Portret ostaje u istom redu sa sadržajem, sa preklapanjem i izlaskom
          50px van desne ivice na svim širinama. */}
      <div className="relative z-0 -ml-[18%] mr-[-50px] min-h-[clamp(340px,72vw,520px)] w-[53%] flex-none overflow-visible min-[881px]:-ml-[12%] min-[881px]:w-[57%] min-[881px]:min-h-[clamp(400px,48vw,700px)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- providni PNG/WebP iz CMS-a, proizvoljan domen */}
        <img
          src={image.src}
          alt={image.alt}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-left min-[881px]:origin-top min-[881px]:translate-x-[280px] min-[881px]:-translate-y-[50px] min-[881px]:scale-[2.5] min-[881px]:object-contain min-[881px]:object-right min-[881px]:object-bottom"
        />
      </div>
      </div>
      <div
        aria-hidden
        className="absolute z-20 top-1/2 right-[50px] -translate-y-1/2 text-center font-parisienne text-[clamp(28px,3.4vw,52px)] text-[#d8ba76] [text-shadow:0_2px_18px_rgba(0,0,0,0.7)] min-[881px]:top-[calc(clamp(28px,5vw,70px)+160px)] min-[881px]:translate-y-0 min-[881px]:-rotate-[5deg] min-[881px]:text-[clamp(39px,4.8vw,73px)]"
      >
        <span className="block leading-[0.84]">
          More
          <br />
          than
        </span>
        <span className="mt-[0.31em] inline-block border-b border-current pb-[0.12em] leading-none">
          nails
        </span>
      </div>
      <div className="absolute z-20 right-[50px] bottom-[clamp(24px,4vw,56px)] hidden border-l border-white/55 pl-[18px] text-left text-[11px] uppercase leading-[2.1] tracking-[0.26em] text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.72)] min-[881px]:block min-[881px]:text-[18px]">
        Zdravo
        <br />
        uređeno
        <br />
        sigurno
      </div>
    </section>
  );
}
