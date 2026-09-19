/**
 * theme-10 „Silver Atelier" — fiksni dizajn tokeni i podrazumevani sadržaj.
 *
 * Paleta i fontovi su zaključani (colorPolicy: "locked"), isto kao theme-7/8/9:
 * tenant branding se ne mapira na ovu temu. Boje su Tailwind tokeni `ash-*`
 * u `globals.css`; ovde stoje samo vrednosti koje se ne mogu izraziti klasom.
 *
 * Podrazumevane slike i tekstovi su iz dizajna (Ash Studio) — prikazuju se dok
 * vlasnica ne unese svoje kroz Landing CMS.
 */

export const THEME10_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500&family=Parisienne&display=swap";

const IMG = "/images/theme-10";

export const THEME10_DEFAULT_IMAGES = {
  hero: { src: `${IMG}/evgenia-cutout.webp`, alt: "Majstor manikira u studiju" },
  styleLeft: { src: `${IMG}/nails-red.webp`, alt: "Manikir u tamnoj bordo nijansi" },
  styleRight: { src: `${IMG}/nails-nude.webp`, alt: "Nude manikir sa sjajnim gel lakom" },
  hygiene: { src: `${IMG}/sterilizacija.webp`, alt: "Sterilizacija instrumenata" },
  gallery: [
    { src: `${IMG}/gallery-1.webp`, alt: "Bordo gel lak" },
    { src: `${IMG}/gallery-2.webp`, alt: "Nude manikir" },
    { src: `${IMG}/gallery-3.webp`, alt: "Bordo manikir, detalj" },
    { src: `${IMG}/gallery-4.webp`, alt: "Prirodni nokti, detalj" },
  ],
} as const;

/** Sidra sekcija — nav ih prikazuje samo ako sekcija postoji na strani. */
export const THEME10_ANCHORS = {
  home: "pocetna",
  services: "usluge",
  style: "stil",
  gallery: "galerija",
  prices: "cene",
  booking: "zakazi",
  contact: "kontakt",
} as const;

/** Jedinstven fokus prsten (prototip ga nema — obavezan za a11y). */
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ash-gold";

/** Hover prelazi 160–200ms ease-out, kao u specifikaciji. */
export const EASE = "transition-colors duration-200 ease-out";

/** Horizontalni padding sekcija: clamp(20px,4vw,56px). */
export const SECTION_X = "px-[clamp(20px,4vw,56px)]";
