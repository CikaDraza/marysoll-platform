/**
 * theme-10 navigacija — sidra sekcija početne strane.
 *
 * Na početnoj su to čista sidra (`#galerija`) i stavka postoji samo ako je
 * sekcija na strani. Na podstranicama nav vodi nazad na početnu
 * (`/{slug}/#galerija`); tamo se ne zna koje su sekcije uključene, pa su
 * navedene sve stalne.
 */
import { THEME10_ANCHORS } from "./constants";
import type { Theme10NavItem } from "./Header";

export interface Theme10NavSections {
  about: boolean;
  gallery: boolean;
  prices: boolean;
}

const ALL_SECTIONS: Theme10NavSections = { about: true, gallery: true, prices: true };

export function buildTheme10Nav(
  prefix: string,
  sections: Theme10NavSections = ALL_SECTIONS,
): Theme10NavItem[] {
  const a = (anchor: string) => `${prefix}#${anchor}`;
  return [
    { label: "Početna", href: a(THEME10_ANCHORS.home) },
    { label: "Usluge", href: a(THEME10_ANCHORS.services) },
    ...(sections.about ? [{ label: "O nama", href: a(THEME10_ANCHORS.style) }] : []),
    ...(sections.gallery ? [{ label: "Galerija", href: a(THEME10_ANCHORS.gallery) }] : []),
    ...(sections.prices ? [{ label: "Cene", href: a(THEME10_ANCHORS.prices) }] : []),
    { label: "Kontakt", href: a(THEME10_ANCHORS.contact) },
  ];
}
