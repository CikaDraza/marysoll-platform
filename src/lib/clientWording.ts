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
