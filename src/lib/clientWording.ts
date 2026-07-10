/**
 * lib/clientWording.ts
 *
 * Per-salon rod klijentele → tekstovi u UI/obaveštenjima. Čist modul (bez DB,
 * bez server-only) — koristi se i na klijentu i na serveru. Rod se čita iz
 * SalonProfile.clientGender (default "neutral" = trenutno ponašanje).
 */
import type { ClientGender } from "@/types";

export function isFemaleClientele(g?: ClientGender | null): boolean {
  return g === "female";
}

/** "Došla" (ženski) / "Došao" (neutral/muški). */
export function arrivedLabel(g?: ClientGender | null): string {
  return isFemaleClientele(g) ? "Došla" : "Došao";
}

/** "Nije došla" (ženski) / "Nije došao" (neutral/muški). */
export function noShowLabel(g?: ClientGender | null): string {
  return isFemaleClientele(g) ? "Nije došla" : "Nije došao";
}

/**
 * Vrati ženski oblik za žensku klijentelu, inače dati default (obično dual
 * oblik, npr. "zakazao/la"). Za slobodne fraze u obaveštenjima.
 */
export function genderPast(
  g: ClientGender | null | undefined,
  femaleForm: string,
  defaultForm: string,
): string {
  return isFemaleClientele(g) ? femaleForm : defaultForm;
}

/** Padež imenice klijent/klijentkinja (nom/gen/dat/akuzativ). */
export type NounCase = "nom" | "gen" | "dat" | "acc";

const CLIENT_NOUN: Record<"female" | "neutral", Record<NounCase, string>> = {
  female: {
    nom: "klijentkinja",
    gen: "klijentkinje",
    dat: "klijentkinji",
    acc: "klijentkinju",
  },
  neutral: { nom: "klijent", gen: "klijenta", dat: "klijentu", acc: "klijenta" },
};

/** Imenica za klijenta u zadatom padežu: "klijentkinja"/"klijent" itd. */
export function clientNoun(
  g: ClientGender | null | undefined,
  c: NounCase = "nom",
): string {
  return CLIENT_NOUN[isFemaleClientele(g) ? "female" : "neutral"][c];
}

/** Isto kao clientNoun, ali sa velikim prvim slovom ("Klijentkinja"/"Klijent"). */
export function clientNounCap(
  g: ClientGender | null | undefined,
  c: NounCase = "nom",
): string {
  const s = clientNoun(g, c);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
