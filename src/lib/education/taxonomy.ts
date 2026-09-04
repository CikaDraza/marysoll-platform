import type { EducationContentKind } from "@/types/education-content";

export const EDUCATION_TAXONOMY_PRESETS = ["skincare"] as const;
export type EducationTaxonomyPreset =
  (typeof EDUCATION_TAXONOMY_PRESETS)[number];

export const SKINCARE_TOPIC_KEYS = [
  "assessment",
  "routine_ingredients",
  "conditions",
  "protection",
] as const;
export type EducationTopicKey = (typeof SKINCARE_TOPIC_KEYS)[number];

export const EDUCATION_INTENT_KEYS = [
  "recognize",
  "explain",
  "care",
  "step_by_step",
] as const;
export type EducationIntentKey = (typeof EDUCATION_INTENT_KEYS)[number];

export interface EducationTaxonomyOption<T extends string> {
  key: T;
  label: string;
  /** Kratka pomoć autoru; nije javna taxonomy vrednost niti Content Coach. */
  help?: string;
}

export interface EducationTaxonomy {
  preset: EducationTaxonomyPreset;
  topics: readonly EducationTaxonomyOption<EducationTopicKey>[];
  intents: readonly EducationTaxonomyOption<EducationIntentKey>[];
}

const SKINCARE_TAXONOMY: EducationTaxonomy = {
  preset: "skincare",
  topics: [
    {
      key: "assessment",
      label: "Procena kože",
      help: "Tip kože, trenutno stanje, dehidriranost, barijera i procena potreba.",
    },
    {
      key: "routine_ingredients",
      label: "Rutina i sastojci",
      help: "Čišćenje, hidratacija, aktivni sastojci, kombinovanje i redosled.",
    },
    {
      key: "conditions",
      label: "Promene i stanja kože",
      help: "Akne, crvenilo, perutanje, pigmentacije, rozacea i druge promene.",
    },
    {
      key: "protection",
      label: "Zaštita kože",
      help: "SPF, UVA/UVB, sunce, spoljašnji uticaji i zaštita barijere.",
    },
  ],
  intents: [
    {
      key: "recognize",
      label: "Kako prepoznati",
      help: "Pomozite čitaocu da primeti razliku, znak ili obrazac.",
    },
    {
      key: "explain",
      label: "Zašto se dešava",
      help: "Objasnite mogući mehanizam, uzrok ili okidač.",
    },
    {
      key: "care",
      label: "Kako negovati",
      help: "Objasnite praktičan pristup nezi i zaštiti.",
    },
    {
      key: "step_by_step",
      label: "Korak po korak",
      help: "Vodite čitaoca kroz jasan redosled postupaka.",
    },
  ],
};

/** Unknown/missing preset deliberately resolves to no taxonomy. */
export function resolveEducationTaxonomy(
  preset: unknown,
): EducationTaxonomy | null {
  return preset === "skincare" ? SKINCARE_TAXONOMY : null;
}

export function taxonomyHasTopic(
  taxonomy: EducationTaxonomy,
  value: unknown,
): value is EducationTopicKey {
  return taxonomy.topics.some(({ key }) => key === value);
}

export function taxonomyHasIntent(
  taxonomy: EducationTaxonomy,
  value: unknown,
): value is EducationIntentKey {
  return taxonomy.intents.some(({ key }) => key === value);
}

export type EducationPublicFormat = "article" | "video";

export const EDUCATION_PUBLIC_FORMAT_LABELS: Record<
  EducationPublicFormat,
  "Članak" | "Video"
> = {
  article: "Članak",
  video: "Video",
};

/** One reader-facing format mapping shared by every public Education surface. */
export function resolveEducationPublicFormat(
  kind: EducationContentKind,
): EducationPublicFormat {
  return kind === "video" ? "video" : "article";
}

export function educationPublicFormatLabel(
  kind: EducationContentKind,
): "Članak" | "Video" {
  return EDUCATION_PUBLIC_FORMAT_LABELS[resolveEducationPublicFormat(kind)];
}
