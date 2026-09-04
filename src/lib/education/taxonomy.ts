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
}

export interface EducationTaxonomy {
  preset: EducationTaxonomyPreset;
  topics: readonly EducationTaxonomyOption<EducationTopicKey>[];
  intents: readonly EducationTaxonomyOption<EducationIntentKey>[];
}

const SKINCARE_TAXONOMY: EducationTaxonomy = {
  preset: "skincare",
  topics: [
    { key: "assessment", label: "Procena kože" },
    { key: "routine_ingredients", label: "Rutina i sastojci" },
    { key: "conditions", label: "Promene i stanja kože" },
    { key: "protection", label: "Zaštita kože" },
  ],
  intents: [
    { key: "recognize", label: "Kako prepoznati" },
    { key: "explain", label: "Zašto se dešava" },
    { key: "care", label: "Kako negovati" },
    { key: "step_by_step", label: "Korak po korak" },
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
