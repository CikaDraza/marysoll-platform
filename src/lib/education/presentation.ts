import { extractTextFromBlocks } from "@/lib/content/blocks/extractTextFromBlocks";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";

/** Prosečno tempo čitanja stručnog teksta na srpskom. */
const WORDS_PER_MINUTE = 200;

/**
 * Vreme čitanja iz stvarnog teksta blokova, ne iz broja znakova.
 *
 * Zaključan sadržaj nema telo u odgovoru, pa za njega vreme ni ne postoji —
 * `null` znači „ne prikazuj", a ne „nula minuta".
 */
export function readingTimeMinutes(
  blocks: readonly ContentBlock[],
): number | null {
  const words = extractTextFromBlocks(blocks)
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  return words === 0 ? null : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number | null): string | null {
  return minutes === null ? null : `${minutes} min čitanja`;
}

/** Datum objave, u obliku u kome ga čitalac očekuje. */
export function formatPublishedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("sr-RS", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

export interface EducationAuthor {
  name: string;
  role?: string;
  image?: string;
}

/**
 * Autor je sam salon — Education nema zaseban autorski model, a izmišljati ga
 * pre nego što postoji više autora značilo bi model bez podataka.
 */
export function educationAuthorFromSalon(salon?: {
  name?: string;
  shortDescription?: string;
  logo?: string | null;
} | null): EducationAuthor | null {
  return salon?.name
    ? {
        name: salon.name,
        role: salon.shortDescription || undefined,
        image: salon.logo || undefined,
      }
    : null;
}
