/**
 * Theme10ServicesStrip — `#usluge`, četiri stuba studija (01–04).
 *
 * Theme-native: ovo nije katalog usluga (on je u cenovniku) nego obećanje
 * brenda, pa sadržaj pripada temi, ne CMS-u.
 */
import { SECTION_X, THEME10_ANCHORS } from "./constants";

const PILLARS = [
  { n: "01", title: "Manikir", body: "Uklanjanje zanoktica, tretman, gel lak, dizajn." },
  { n: "02", title: "Pedikir", body: "Potpuna nega stopala i noktiju." },
  { n: "03", title: "Estetika", body: "Savremene tehnike i moderni dizajn." },
  { n: "04", title: "Higijena", body: "Sterilni instrumenti i sigurni uslovi." },
];

export function Theme10ServicesStrip() {
  return (
    <section
      id={THEME10_ANCHORS.services}
      aria-label="Usluge"
      className={`border-b border-ash-ink/8 bg-ash-paper py-[clamp(44px,5vw,72px)] ${SECTION_X}`}
    >
      <div className="grid grid-cols-2 gap-0 min-[900px]:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {PILLARS.map((p, i) => (
          <div
            key={p.n}
            className={`flex gap-5 border-l border-ash-ink/10 px-[clamp(16px,2.4vw,34px)] py-[clamp(14px,2vw,26px)] max-[899px]:border-t max-[899px]:[&:nth-child(-n+2)]:border-t-0 ${
              i === PILLARS.length - 1 ? "min-[900px]:border-r" : ""
            }`}
          >
            <span className="font-cormorant text-[clamp(38px,3.6vw,54px)] leading-[0.85] font-light text-ash-gold">
              {p.n}
            </span>
            <div>
              <h3 className="mb-2.5 text-[13.5px] font-normal uppercase tracking-[0.22em]">
                {p.title}
              </h3>
              <p className="text-[14.5px] font-light leading-[1.6] text-ash-ink-mute">
                {p.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
