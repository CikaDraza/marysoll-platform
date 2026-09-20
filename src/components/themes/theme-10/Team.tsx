"use client";
/**
 * Theme10Team — „Naš tim majstora", prikaz `content.team` bloka.
 *
 * `members` je uvek popunjen (blockProps pada na tim iz dizajna kad CMS nema
 * podatke — vidi `theme10TeamProps`), pa ova komponenta nema prazno stanje.
 *
 * Svaki red otvara booking modal ZAKLJUČAN na tog majstora — bedž u zaglavlju
 * modala + napomena termina, ne filter dostupnosti: booking domen
 * (`Appointment.staffProfileId`) postoji u modelu, ali se nigde ne upisuje,
 * pa nema veze usluga ↔ zaposleni za salonov pravi katalog. Vidi
 * `booking/context.ts`.
 */
import { useTheme10Booking } from "./booking/context";
import { CONTENT_WIDTH, FOCUS_RING, SECTION_X } from "./constants";

export interface Theme10TeamProps {
  headlineLines: string[];
  members: { name: string; role: string }[];
  bookHref: string;
}

export function Theme10Team({ headlineLines, members, bookHref }: Theme10TeamProps) {
  const { openForMaster, available } = useTheme10Booking();

  return (
    <section
      className="border-b border-ash-ink/8 bg-ash-paper-3 py-[clamp(56px,6vw,104px)]"
    >
      <div className={`${CONTENT_WIDTH} ${SECTION_X}`}>
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
                openForMaster({ name: m.name, spec: m.role });
              }}
              className={`group flex w-full items-baseline gap-[clamp(16px,2vw,28px)] border-t border-ash-ink/14 py-[22px] pr-[18px] text-left transition-colors duration-200 ease-out hover:bg-ash-paper motion-reduce:transition-none ${FOCUS_RING}`}
            >
              {/* `transform` odvojeno od `background-color` — translateX je
                  GPU-ubrzan i podnosi duži/finiji trajanje bez trzaja. */}
              <span className="flex w-full items-baseline gap-[clamp(16px,2vw,28px)] transition-transform duration-300 ease-out group-hover:translate-x-[18px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
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
              </span>
            </a>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
}
