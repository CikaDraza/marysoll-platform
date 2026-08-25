/**
 * lib/displayName.ts
 *
 * Skraćivanje imena prijavljenog korisnika za uske površine — dugme u headeru
 * teme, admin/superadmin header, sidebar klijentskog panela. Čist modul (bez
 * React-a, bez DB-a), pa isto pravilo važi svuda umesto da svaka komponenta
 * improvizuje svoj `split(" ")`.
 *
 * Razlog: pun naziv je razvlačio dugme preko širine ekrana na mobilnom, a na
 * desktopu je posle logoa i naziva salona gurao nav linkove i CTA u drugi red.
 * Za signal „prijavljena si" celo ime nije potrebno — dovoljno je ime i početak
 * prezimena.
 */

/** Koliko karaktera drugog imena stane pre skraćivanja. */
const SECOND_PART_MAX = 6;

/**
 * Ime za usko dugme: najviše dve reči, druga skraćena na 6 karaktera.
 *
 *   "Marina B."                → "Marina B."
 *   "Marina Bojic"             → "Marina Bojic"
 *   "Marina Bosiljkovicka"     → "Marina Bosilj…"
 *   "Marina B. Stanisavljevic" → "Marina B."
 *
 * Sve posle druge reči se odbacuje — otud „iseci na jedan razmak". Prva reč se
 * NE skraćuje: ona nosi identitet, a za nju ostaje CSS `truncate` na samom
 * dugmetu.
 *
 * Prazan ulaz vraća prazan string, da pozivalac zadrži svoj fallback
 * ("Korisnik", inicijal u avataru…) umesto da ga ovaj helper bira umesto njega.
 */
export function shortDisplayName(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";

  const [first, second] = parts;
  if (!second) return first;

  // Array.from, ne slice — da dijakritika i par surogata ne budu presečeni na
  // pola karaktera.
  const chars = Array.from(second);
  if (chars.length <= SECOND_PART_MAX) return `${first} ${second}`;

  return `${first} ${chars.slice(0, SECOND_PART_MAX).join("")}…`;
}
