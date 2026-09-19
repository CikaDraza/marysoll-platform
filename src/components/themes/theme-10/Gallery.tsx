/**
 * Theme10Gallery — `#galerija`, prikaz `content.gallery` bloka.
 * Pločice su fiksnog odnosa 3:4; slika se blago uvećava na hover.
 */
import { BookLink } from "./BookLink";
import { EASE, FOCUS_RING, SECTION_X, THEME10_ANCHORS } from "./constants";

export interface Theme10GalleryProps {
  headlineLines: string[];
  body: string;
  images: { src: string; alt: string }[];
  bookHref: string;
}

export function Theme10Gallery({
  headlineLines,
  body,
  images,
  bookHref,
}: Theme10GalleryProps) {
  return (
    <section
      id={THEME10_ANCHORS.gallery}
      className={`bg-ash-paper py-[clamp(56px,6vw,104px)] ${SECTION_X}`}
    >
      <div className="mb-[clamp(28px,3vw,48px)] grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-end gap-[clamp(24px,3vw,56px)]">
        <div>
          <span className="text-[11px] uppercase tracking-[0.3em] text-ash-ink-faint">
            Galerija
          </span>
          <h2 className="mt-3.5 font-cormorant text-[clamp(32px,3.6vw,58px)] font-normal uppercase leading-[1.02]">
            {headlineLines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h2>
        </div>
        <div className="flex flex-col items-start gap-[18px]">
          <p className="max-w-[40ch] text-[15.5px] font-light leading-[1.7] text-ash-ink-soft">
            {body}
          </p>
          <BookLink
            href={bookHref}
            className={`inline-flex items-center gap-3 rounded-full border border-ash-gold px-[26px] py-3.5 text-[11.5px] uppercase tracking-[0.2em] text-ash-gold-dk hover:bg-ash-gold hover:text-white ${EASE} ${FOCUS_RING}`}
          >
            Zakaži svoj izgled <span aria-hidden>→</span>
          </BookLink>
        </div>
      </div>

      <ul className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[clamp(10px,1.2vw,18px)]">
        {images.map((img, i) => (
          <li key={`${img.src}-${i}`} className="aspect-[3/4] overflow-hidden bg-[#e3e1de]">
            {/* eslint-disable-next-line @next/next/no-img-element -- CMS slika, proizvoljan domen */}
            <img
              src={img.src}
              alt={img.alt}
              loading="lazy"
              className="h-full w-full object-cover object-center transition-transform duration-500 ease-out hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
