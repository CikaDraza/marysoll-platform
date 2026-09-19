"use client";
/**
 * Theme10Team — „Naš tim majstora", prikaz `content.team` bloka.
 *
 * Svaki red otvara booking modal. Dizajn ga zaključava na tog majstora; to
 * čeka vezu usluga ↔ zaposleni u booking domenu, pa red za sada otvara isti
 * (otvoren) tok kao ostali CTA-ovi. Bez članova tima desna kolona prikazuje
 * tri razloga za online zakazivanje iz dizajna.
 */
import { useTheme10Booking } from "./booking/context";
import { FOCUS_RING, SECTION_X } from "./constants";

export interface Theme10TeamProps {
  headlineLines: string[];
  members: { name: string; role: string }[];
  bookHref: string;
}

const REASONS = [
  {
    title: "Bez čekanja na odgovor",
    body: "Birate termin i u 23h — ujutru je već potvrđen.",
  },
  {
    title: "Instagram i Telegram ostaju",
    body: "Ko voli poruku — piše poruku. Ostali kliknu dugme.",
  },
  {
    title: "Termin za minut",
    body: "Slobodni termini su vidljivi odmah, bez dopisivanja.",
  },
];

export function Theme10Team({ headlineLines, members, bookHref }: Theme10TeamProps) {
  const { open, available } = useTheme10Booking();

  return (
    <section
      className={`border-b border-ash-ink/8 bg-ash-paper-3 py-[clamp(56px,6vw,104px)] ${SECTION_X}`}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-[clamp(32px,4vw,72px)]">
        <div className="flex flex-col gap-5">
          <span className="text-[11px] uppercase tracking-[0.3em] text-ash-ink-faint">
            Zakazivanje
          </span>
          <h2 className="font-cormorant text-[clamp(30px,3.2vw,52px)] font-normal leading-[1.04]">
            {headlineLines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h2>
          {/* Jedini crveni akcenat na strani. */}
          <span className="h-px w-14 bg-ash-blood" />
          <p className="max-w-[40ch] text-base font-light leading-[1.75] text-ash-ink-soft">
            Usluge koje vode naši majstori — izaberite slobodan termin i zakažite
            online.
          </p>
        </div>

        {members.length > 0 ? (
          <div className="flex flex-col">
            <span className="mb-[18px] text-[11px] uppercase tracking-[0.3em] text-ash-ink-faint">
              Tim
            </span>
            {members.map((m, i) => (
              <a
                key={`${m.name}-${i}`}
                href={bookHref}
                aria-haspopup={available ? "dialog" : undefined}
                onClick={(e) => {
                  if (!available || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  open();
                }}
                className={`flex w-full items-baseline gap-[clamp(16px,2vw,28px)] border-t border-ash-ink/14 py-[22px] pr-[18px] text-left transition-[background-color,padding] duration-200 ease-out hover:bg-ash-paper hover:pl-[18px] motion-reduce:transition-none ${FOCUS_RING}`}
              >
                <span className="flex-none font-cormorant text-[34px] leading-none text-ash-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="font-cormorant text-[30px] leading-none text-ash-gold-dk">
                    {m.name}
                  </span>
                  {m.role && (
                    <span className="text-sm font-light leading-normal text-ash-ink-mute">
                      {m.role}
                    </span>
                  )}
                </span>
                <span className="flex-none whitespace-nowrap text-[10.5px] uppercase tracking-[0.22em] text-ash-ink-soft">
                  Termini <span aria-hidden>→</span>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <ol className="grid gap-px border border-ash-ink/10 bg-ash-ink/10">
            {REASONS.map((r, i) => (
              <li
                key={r.title}
                className="flex items-baseline gap-5 bg-ash-paper p-[clamp(20px,2.4vw,32px)]"
              >
                <span className="font-cormorant text-[34px] leading-none text-ash-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col gap-2">
                  <span className="text-[13px] uppercase tracking-[0.2em]">{r.title}</span>
                  <span className="text-[14.5px] font-light leading-[1.6] text-ash-ink-mute">
                    {r.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
