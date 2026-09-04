import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import type { EducationContentKind } from "@/types/education-content";

/**
 * Polazna kostura po vrsti sadržaja.
 *
 * Obrazac je preuzet iz Marininih stvarnih materijala, ne izmišljen: naslov i
 * podnaslov, pa numerisane stručne sekcije sa pasusima i nabrajanjima, i na
 * kraju STRUČNA OGRADA koja razdvaja kozmetičku edukaciju od medicinske
 * procene. Ta ograda se ponavlja u SVAKOM njenom dokumentu, pa je deo preseta,
 * a ne nešto čega se seti na kraju.
 *
 * ZAŠTO NEMA HERO BLOKA: naslov, vrsta, podnaslov i naslovna slika su
 * zaglavlje STRANE (vidi `EducationArticleView`), ne blok. Hero blok bi
 * duplirao naslov i napravio drugi `h1`.
 *
 * Preset je polazište, ne šablon — svaki blok se briše, menja i dopunjuje.
 */
/** Blok bez `id` i `priority` — njih dodeljuje editor pri ubacivanju. */
type WithoutIdentity<T> = T extends unknown ? Omit<T, "id" | "priority"> : never;
export type PresetBlockDraft = WithoutIdentity<ContentBlock>;

/** Ograda se pojavljuje u svakom materijalu, pa je svuda ista. */
const EXPERT_DISCLAIMER: PresetBlockDraft = {
  type: "CalloutBlock",
  variant: "important",
  title: "Stručna ograda",
  content:
    "Ovaj materijal je edukativni sadržaj iz ugla kozmetičara i odnosi se na " +
    "estetiku, negu kože i odgovoran odnos prema sopstvenom izgledu.\n" +
    "Nije medicinski savet, dijagnoza niti procena rada zdravstvenih " +
    "profesionalaca.\n" +
    "Za procenu zdravstvenog stanja kože i medicinskih procedura obratite se " +
    "odgovarajućem zdravstvenom profesionalcu.",
};

const PRESETS: Record<EducationContentKind, PresetBlockDraft[]> = {
  article: [
    { type: "ArticleBlock", title: "Uvod", paragraphs: [""] },
    {
      type: "ArticleBlock",
      title: "Prva tema",
      paragraphs: [""],
      items: ["", ""],
    },
    EXPERT_DISCLAIMER,
  ],
  advice: [
    { type: "ArticleBlock", title: "O čemu je reč", paragraphs: [""] },
    { type: "ChecklistBlock", title: "Šta konkretno raditi", items: [] },
    EXPERT_DISCLAIMER,
  ],
  guide: [
    { type: "ArticleBlock", title: "Uvod", paragraphs: [""] },
    { type: "ChecklistBlock", title: "Koraci", items: [] },
    {
      type: "TableBlock",
      title: "Pregled",
      columns: [],
      rows: [],
    },
    EXPERT_DISCLAIMER,
  ],
  // Video sadržaj počinje od videa: prazan generički članak bi značio da
  // vlasnica prvo mora da obriše ono što joj ne treba.
  video: [
    { type: "VideoBlock" },
    { type: "ArticleBlock", title: "O snimku", paragraphs: [""] },
    EXPERT_DISCLAIMER,
  ],
  material: [
    { type: "ArticleBlock", title: "Šta sadrži materijal", paragraphs: [""] },
    {
      type: "FileDownloadBlock",
      title: "Preuzmite materijal",
      file: null,
    },
    EXPERT_DISCLAIMER,
  ],
};

export function educationPresetBlocks(
  kind: EducationContentKind,
  idFactory: () => string,
): ContentBlock[] {
  return PRESETS[kind].map(
    (draft, index) =>
      ({ ...draft, id: idFactory(), priority: index + 1 }) as ContentBlock,
  );
}

/**
 * Video sadržaj bez izvora nije video.
 *
 * Naslov i opis samog video bloka su opcioni — izvor nije. Ovo je host
 * pravilo, pa se proverava pri objavi, a ne u deljenoj shemi bloka: isti
 * `VideoBlock` u članku sme da bude prateći, ovde je razlog postojanja.
 */
export function missingRequiredVideoSource(
  kind: EducationContentKind,
  blocks: readonly ContentBlock[],
): boolean {
  if (kind !== "video") return false;

  return !blocks.some(
    (block) =>
      block.type === "VideoBlock" &&
      block.visibility !== "hidden" &&
      Boolean(
        block.source &&
          (block.source.provider === "upload"
            ? block.source.media?.src
            : block.source.url),
      ),
  );
}
