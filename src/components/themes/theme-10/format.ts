/**
 * theme-10 formatiranje — cene, trajanje, datumi i srpska množina.
 *
 * Čiste funkcije (bez React-a) da bi se mogle testirati.
 */
import type { IService } from "@/types";
import { isPriceFrom, minServicePrice } from "@/helpers/servicePrice";

const MONTHS_SHORT = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "avg", "sep", "okt", "nov", "dec",
];

/** Ponedeljak prvi — isti redosled kao dani u modalu. */
export const DOW_SHORT = ["PON", "UTO", "SRE", "ČET", "PET", "SUB", "NED"];

/** 1500 → "1.500 rsd" (tačka kao separator hiljada, sr-RS). */
export function formatRsd(value: number): string {
  return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} rsd`;
}

/** Cena usluge za cenovnik i modal; `null` = nepoznata (prikazuje se „—"). */
export function servicePriceLabel(service: IService): string | null {
  if (service.priceMode === "on_request") return "Na upit";
  const min = minServicePrice(service);
  if (min == null) return null;
  return isPriceFrom(service) ? `od ${formatRsd(min)}` : formatRsd(min);
}

export function serviceDurationLabel(service: IService): string | null {
  return service.duration ? `${service.duration} min` : null;
}

/**
 * Srpska množina za „slobodan termin": 1 slobodan, 2–4 slobodna, ostalo
 * slobodnih; 11–14 su uvek „slobodnih".
 */
export function freeSlotsLabel(n: number): string {
  const tens = n % 100;
  const ones = n % 10;
  if (tens >= 11 && tens <= 14) return `${n} slobodnih`;
  if (ones === 1) return `${n} slobodan`;
  if (ones >= 2 && ones <= 4) return `${n} slobodna`;
  return `${n} slobodnih`;
}

/** Date → "14. sep" */
export function formatDayMonth(d: Date): string {
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Date → "PON, 14. sep" */
export function formatDayHeading(d: Date): string {
  return `${DOW_SHORT[(d.getDay() + 6) % 7]}, ${formatDayMonth(d)}`;
}

/** Date → "PON, 14. sep 2026." */
export function formatDayLong(d: Date): string {
  return `${formatDayHeading(d)} ${d.getFullYear()}.`;
}

/** Ponedeljak sedmice u kojoj je `d`, u ponoć lokalnog vremena. */
export function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

/** Date → "YYYY-MM-DD" po lokalnom vremenu. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → lokalni Date. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Tekst iz CMS-a u redove naslova: novi red iz polja je prelom. Prazan unos
 * vraća podrazumevane redove iz dizajna.
 */
export function headlineLines(value: string | undefined, fallback: string[]): string[] {
  const lines = (value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : fallback;
}
