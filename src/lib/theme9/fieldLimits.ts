/**
 * lib/theme9/fieldLimits.ts — 2B.3 ograničenja unosa za theme-9 CMS
 *
 * Čist modul: bez React-a, bez DB-a. Editor ga koristi za `maxLength` i za
 * objašnjenje čemu polje služi.
 *
 * ZAŠTO POSTOJI
 * Expert Editorial je gust dizajn sa fiksnim ritmom — naslov u dva reda,
 * kartica sa tri stavke, kalendar u četiri ćelije. Predugačak unos ne pravi
 * grešku, nego tiho razbija raspored, i to tek na javnom sajtu. Granica mora
 * postojati na ulazu, ne na prikazu.
 *
 * ODAKLE BROJEVI
 * Nisu izmišljeni. Izmereni su nad zatečenim Expert Editorial sadržajem koji je
 * vlasnica već videla i odobrila, pa im je dodato zaglavlje za disanje. Tačan
 * izvor merenja i zapaženi maksimumi zaključani su u `fieldLimits.test.ts`, koji
 * pada ako neko snizi granicu ispod stvarnog teksta.
 *
 * Ovaj modul NE uvozi taj sadržaj i ne sme — seed nikada nije runtime fallback
 * (guard: `theme-pages.test.ts`, „nijedan fajl u src/ ne uvozi seed podatke").
 * Ovde žive samo brojevi. Zapaženi maksimumi po vrsti polja:
 *
 *     eyebrow   26   headline   62   lead      168   note   121
 *     itemTitle 27   itemText   83   bullet     40   chip    16
 *     ctaLabel  22   price      21   slot        6   label   19
 *
 * POSLEDICA PO ZATEČEN SADRŽAJ
 * `maxLength` ne skraćuje ono što je već upisano — samo sprečava da naraste.
 * Pošto je svaki limit veći od zapaženog maksimuma, nijedan seed-ovan tekst
 * nije ugrožen i ništa se ne gubi.
 */

/** Vrsta polja — određuje i granicu i objašnjenje. */
export type Theme9FieldKind =
  | "eyebrow"
  | "headline"
  | "lead"
  | "note"
  | "itemTitle"
  | "itemText"
  | "bullet"
  | "chip"
  | "ctaLabel"
  | "price"
  | "slot"
  | "smallLabel"
  | "altText"
  | "url";

export interface Theme9FieldRule {
  /** Najviše karaktera koje editor prima. */
  max: number;
  /** Čemu polje služi — prikazuje se ispod naziva u panelu. */
  purpose: string;
}

export const THEME9_FIELD_RULES: Record<Theme9FieldKind, Theme9FieldRule> = {
  eyebrow: {
    max: 32,
    purpose: "Sitna oznaka iznad naslova. Dve do tri reči.",
  },
  headline: {
    max: 80,
    purpose: "Glavni naslov sekcije. Staje u dva reda.",
  },
  lead: {
    max: 220,
    purpose: "Uvodni pasus uz naslov. Jedna do dve rečenice.",
  },
  note: {
    max: 160,
    purpose: "Sitna napomena na dnu sekcije. Jedna rečenica.",
  },
  itemTitle: {
    max: 40,
    purpose: "Naslov jedne stavke. Kratko — stoji u jednom redu.",
  },
  itemText: {
    max: 180,
    purpose: "Opis jedne stavke. Jedna do dve rečenice.",
  },
  bullet: {
    max: 60,
    purpose: "Stavka u listi. Bez tačke na kraju.",
  },
  chip: {
    max: 24,
    purpose: "Mala oznaka na kartici. Jedna do dve reči.",
  },
  ctaLabel: {
    max: 32,
    purpose: "Tekst na dugmetu. Glagol i imenica, npr. „Zakaži termin”.",
  },
  price: {
    max: 32,
    purpose: "Cena ili trajanje, kako želite da piše.",
  },
  slot: {
    max: 12,
    purpose: "Staje u jednu ćeliju kalendara.",
  },
  smallLabel: {
    max: 24,
    purpose: "Kratak natpis. Jedna do dve reči.",
  },
  altText: {
    max: 60,
    purpose: "Opis slike za čitače ekrana. Ne vidi se na sajtu.",
  },
  url: {
    max: 300,
    purpose: "Adresa. Ne prikazuje se kao tekst.",
  },
};

/** Granica za vrstu polja. */
export function fieldMax(kind: Theme9FieldKind): number {
  return THEME9_FIELD_RULES[kind].max;
}

/** Objašnjenje čemu polje služi. */
export function fieldPurpose(kind: Theme9FieldKind): string {
  return THEME9_FIELD_RULES[kind].purpose;
}

/**
 * Stanje brojača ispod polja.
 *
 * `near` počinje na 85% granice — dovoljno rano da se tekst skrati pre nego
 * što se udari u zid, a ne toliko rano da brojač stalno vrišti.
 */
export type FieldFillState = "ok" | "near" | "full";

export function fieldFillState(
  length: number,
  kind: Theme9FieldKind,
): FieldFillState {
  const max = fieldMax(kind);
  if (length >= max) return "full";
  if (length >= Math.floor(max * 0.85)) return "near";
  return "ok";
}
