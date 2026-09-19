/**
 * Theme10CtaBand — `#zakazi`, završni poziv na zakazivanje (theme-native).
 * Desni tamni panel nosi logo salona u svetloj varijanti.
 */
import { BookLink } from "./BookLink";
import { EASE, FOCUS_RING, THEME10_ANCHORS } from "./constants";
import { LightLogo } from "./LightLogo";

export function Theme10CtaBand({
  bookHref,
  salonName,
  logo,
}: {
  bookHref: string;
  salonName: string;
  logo?: string;
}) {
  return (
    <section
      id={THEME10_ANCHORS.booking}
      className="grid grid-cols-1 bg-[linear-gradient(120deg,#e9e7e4_0%,#d4d2ce_100%)] min-[900px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.6fr)]"
    >
      <div className="flex flex-col justify-center gap-5 px-[clamp(24px,3.6vw,64px)] py-[clamp(48px,5.5vw,96px)]">
        <span className="text-[11px] uppercase leading-[2] tracking-[0.3em] text-ash-ink-faint">
          Vreme je
          <br />
          za vaše nokte
        </span>
        <h2 className="font-cormorant text-[clamp(36px,4.6vw,76px)] font-normal leading-[0.98]">
          ZAKAŽITE
          <br />
          SVOJ TERMIN
        </h2>
        <span className="h-px w-[72px] bg-ash-gold" />
      </div>
      <div className="flex flex-col justify-center gap-[18px] bg-ash-paper px-[clamp(24px,3vw,48px)] py-[clamp(36px,4vw,72px)]">
        <span className="text-[11px] uppercase tracking-[0.26em] text-ash-ink-faint">
          Brzo · Jednostavno · Online
        </span>
        <BookLink
          href={bookHref}
          className={`inline-flex items-center gap-3.5 self-start rounded-full bg-ash-ink px-8 py-[18px] text-[12px] uppercase tracking-[0.2em] text-ash-paper-2 hover:bg-ash-gold hover:text-white ${EASE} ${FOCUS_RING}`}
        >
          Zakaži odmah <span aria-hidden>→</span>
        </BookLink>
        <p className="text-[14.5px] font-light leading-[1.7] text-ash-ink-mute">
          Dostupni termini u realnom vremenu.
        </p>
      </div>
      <div className="flex flex-col items-start justify-center bg-[linear-gradient(160deg,#4a4845_0%,#2b2a28_100%)] p-[clamp(28px,3vw,56px)] min-[900px]:items-end">
        <LightLogo
          salonName={salonName}
          logo={logo}
          className="h-[clamp(64px,7vw,104px)]"
          textClassName="text-[clamp(24px,2.6vw,36px)]"
        />
      </div>
    </section>
  );
}
