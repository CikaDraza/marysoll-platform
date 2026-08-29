/**
 * Domenske vrednosti Education sadržaja — BEZ Mongoose-a.
 *
 * Ovo mora ostati čist modul: editor, lista i validacija ih koriste u
 * pregledaču, pa bi svako povlačenje modela odavde uvuklo Mongoose u klijentski
 * bundle. Presedan: `types/tenant-capabilities.ts`.
 */
export const EDUCATION_CONTENT_KINDS = [
  "advice",
  "article",
  "guide",
  "video",
  "material",
] as const;

export const EDUCATION_CONTENT_VISIBILITIES = ["public", "private"] as const;
export const EDUCATION_CONTENT_STATUSES = ["draft", "published"] as const;

export type EducationContentKind = (typeof EDUCATION_CONTENT_KINDS)[number];
export type EducationContentVisibility =
  (typeof EDUCATION_CONTENT_VISIBILITIES)[number];
export type EducationContentStatus =
  (typeof EDUCATION_CONTENT_STATUSES)[number];
