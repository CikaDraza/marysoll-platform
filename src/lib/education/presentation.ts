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
 * Ne briše se nego se upija: njegov podnaslov i slika POSTAJU zaglavlje.
 *
 * Hero ima prednost nad SEO poljima namerno. SEO opis i OG slika su napisani
 * za pretragu i deljenje; hero je ono što je autor napisao za čitaoca i sme da
 * se razlikuje. Kada hero ne postoji, zaglavlje pada na SEO.
 *
 * Naslov je izuzetak i uvek dolazi iz `EducationContent.title`: on je identitet
 * dokumenta — isti u listi, breadcrumb-u i deljenom linku — pa ne sme da zavisi
 * od toga da li u telu postoji blok.
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
    description: hero?.subtitle || article.description || undefined,
    // Fokus kadra ide zajedno sa slikom; bez njega se naslovna slika seče
    // mimo onoga što je autor izabrao.
    cover: heroImage?.src
      ? { src: heroImage.src, focalPoint: heroImage.focalPoint }
      : article.cover,
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
