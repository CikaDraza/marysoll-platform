/**
 * Theme10Hygiene — „Dezinfekcija i sterilizacija". Theme-native sekcija
 * (standard studija, ne CMS sadržaj).
 */
import { CONTENT_WIDTH, EASE, FOCUS_RING, THEME10_DEFAULT_IMAGES } from "./constants";

export function Theme10Hygiene({ moreHref }: { moreHref: string }) {
  const image = THEME10_DEFAULT_IMAGES.hygiene;
  return (
    <section className="w-full border-y border-ash-ink/8 bg-[linear-gradient(120deg,#e9e7e4_0%,#d9d7d3_100%)]">
      <div className={`${CONTENT_WIDTH} grid grid-cols-1 min-[1000px]:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.7fr)_minmax(220px,0.75fr)]`}>
      <div className="flex flex-col justify-center gap-[22px] px-[clamp(24px,3.4vw,56px)] py-[clamp(40px,5vw,80px)]">
        <span className="text-[11px] uppercase tracking-[0.3em] text-ash-ink-faint">
          Vaše zdravlje je na prvom mestu
        </span>
        <h2 className="font-cormorant text-[clamp(30px,3.2vw,50px)] font-normal leading-[1.05]">
          Dezinfekcija
          <br />i sterilizacija
        </h2>
        <span className="h-px w-14 bg-ash-gold" />
        <p className="max-w-[30ch] text-base font-light leading-[1.75] text-ash-ink-soft">
          Higijena nije opcija — to je naš standard. Svaki instrument prolazi kroz
          sterilizaciju pre svakog termina.
        </p>
        <a
          href={moreHref}
          className={`inline-flex items-center gap-3 self-start rounded-full border border-ash-ink px-7 py-[15px] text-[11.5px] uppercase tracking-[0.2em] hover:bg-ash-ink hover:text-ash-paper-2 ${EASE} ${FOCUS_RING}`}
        >
          Saznaj više <span aria-hidden>→</span>
        </a>
      </div>
      <div className="relative min-h-[clamp(280px,30vw,460px)] overflow-hidden bg-[#cfcdc9]">
        {/* eslint-disable-next-line @next/next/no-img-element -- statična slika teme */}
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain object-center"
        />
      </div>
      <div className="hidden min-h-0 items-center py-[clamp(24px,3vw,48px)] pr-3 pl-[clamp(14px,1.6vw,28px)] min-[1000px]:flex">
        <div className="border-l border-ash-ink/25 py-1.5 pl-[18px] text-[10.5px] uppercase leading-[2.2] tracking-[0.18em] whitespace-nowrap text-[#3a3936]">
          Sigurnost
          <br />
          Poverenje
          <br />
          Profesionalnost
        </div>
      </div>
      </div>
    </section>
  );
}
