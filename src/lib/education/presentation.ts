import { extractTextFromBlocks } from "@/lib/content/blocks/extractTextFromBlocks";
import type {
  ContentBlock,
  ContentFocalPoint,
} from "@/lib/content/schemas/landing-blocks";

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

/**
 * Kod Education članka naslovnu sekciju nosi ZAGLAVLJE STRANE — vrsta, naslov,
 * podnaslov, datum i naslovna slika. Hero blok u telu je zato duplikat: isti
 * naslov drugi put, u drugom kadru i drugoj tipografiji.
 *
 * Od uvođenja naslovne sekcije, opis i naslovna slika stižu SPREMNI sa servera
 * — iz jednog izvora koji hrani i karticu i zaglavlje. Ovde ostaje samo
 * apsorpcija zatečenog hero BLOKA, za sadržaj pisan pre te sekcije: takav blok
 * se ne renderuje u telu, a njegov podnaslov i slika popunjavaju zaglavlje ako
 * ga sekcija još nije popunila. Prva sledeća objava ga trajno preseli.
 *
 * Naslov je izuzetak i uvek dolazi iz `EducationContent.title`: on je identitet
 * dokumenta — isti u listi, breadcrumb-u i deljenom linku.
 */
export function resolveArticlePresentation(article: {
  description?: string;
  cover?: { src: string; focalPoint?: ContentFocalPoint };
  blocks: readonly ContentBlock[];
}): {
  description?: string;
  cover?: { src: string; focalPoint?: ContentFocalPoint };
  blocks: ContentBlock[];
} {
  const hero = article.blocks.find((block) => block.type === "HeroBlock");
  const heroImage = hero?.images?.[0];

  return {
    description: article.description || hero?.subtitle || undefined,
    // Fokus kadra ide zajedno sa slikom; bez njega se naslovna slika seče
    // mimo onoga što je autor izabrao.
    cover:
      article.cover ??
      (heroImage?.src
        ? { src: heroImage.src, focalPoint: heroImage.focalPoint }
        : undefined),
    blocks: article.blocks.filter((block) => block.type !== "HeroBlock"),
  };
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
