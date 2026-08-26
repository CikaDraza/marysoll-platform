/**
 * lib/theme9/sectionDisplayChoice.ts — 2B.4 tri-state izbor u CMS-u
 *
 * Prevodi između onoga što vlasnica bira u panelu i onoga što stoji u bazi.
 * Čist modul: bez React-a, bez DB-a.
 *
 *     PANEL                    BAZA                    PRIKAZ
 *     Podrazumevano       →    `enabled` ODSUTAN   →   odlučuje resolver
 *     Uključeno           →    `enabled: true`     →   vlasnica traži sekciju
 *     Isključeno          →    `enabled: false`    →   apsolutni veto
 *
 * ZAŠTO NE CHECKBOX
 * Checkbox sa „indeterminate" stanjem tehnički može da nosi tri vrednosti, ali
 * vlasnici ne govori ništa — treće stanje izgleda kao pokvarena kvačica.
 * Zato je izbor eksplicitan, sa tri imenovana dugmeta i objašnjenjem.
 *
 * ZAŠTO `null` A NE `undefined`
 * Izbor putuje kao JSON od panela do servera, a `JSON.stringify` **briše**
 * ključeve sa `undefined`. Izostavljen ključ bi na serveru značio „ništa ne
 * menjaj" (lossless merge zadržava zatečenu vrednost), pa se odluka nikad ne bi
 * mogla ukloniti. `null` preživi prenos i nosi jasnu poruku: ukloni odluku.
 *
 * `null` postoji SAMO u letu. U bazi se nikada ne čuva — `mergeLandingStructureUpdate()`
 * ga pretvara u uklanjanje ključa.
 */

/** Šta vlasnica bira u panelu. */
export type SectionDisplayChoice = "default" | "on" | "off";

export interface SectionDisplayChoiceOption {
  value: SectionDisplayChoice;
  label: string;
  /** Objašnjenje ispod izbora — vidi se samo za izabranu opciju. */
  hint: string;
}

/**
 * Redosled je namerno „najmekši → najtvrđi": podrazumevano, pa izričito uključi,
 * pa apsolutni veto.
 */
export const SECTION_DISPLAY_CHOICES: readonly SectionDisplayChoiceOption[] = [
  {
    value: "default",
    label: "Podrazumevano",
    hint: "Tema odlučuje prikaz na osnovu sadržaja.",
  },
  {
    value: "on",
    label: "Uključeno",
    hint: "Sekcija se prikazuje.",
  },
  {
    value: "off",
    label: "Isključeno",
    hint: "Sekcija se ne prikazuje. Sadržaj ostaje sačuvan.",
  },
] as const;

/** Stanje iz baze → izbor u panelu. */
export function choiceFromEnabled(
  enabled: boolean | null | undefined,
): SectionDisplayChoice {
  if (enabled === true) return "on";
  if (enabled === false) return "off";
  // `undefined` (nema ključa) i `null` (upravo obrisano) su isto stanje:
  // odluka ne postoji.
  return "default";
}

/**
 * Izbor u panelu → vrednost koja se šalje serveru.
 *
 * `null` znači UKLONI KLJUČ, ne „upiši null".
 */
export function enabledFromChoice(
  choice: SectionDisplayChoice,
): boolean | null {
  if (choice === "on") return true;
  if (choice === "off") return false;
  return null;
}

/** Objašnjenje uz izabranu opciju. */
export function choiceHint(choice: SectionDisplayChoice): string {
  return (
    SECTION_DISPLAY_CHOICES.find((o) => o.value === choice)?.hint ??
    SECTION_DISPLAY_CHOICES[0].hint
  );
}

/**
 * Da li panel prikazuje polja za unos.
 *
 * `Podrazumevano` MORA da prikaže editor — sadržaj je upravo ono na osnovu čega
 * tema donosi odluku, pa bi sakriveni editor bio zamka: vlasnica ne bi imala
 * gde da unese ono što odlučuje prikaz.
 */
export function editorVisibleFor(choice: SectionDisplayChoice): boolean {
  return choice !== "off";
}
