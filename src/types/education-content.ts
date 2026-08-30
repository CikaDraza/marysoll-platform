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

/**
 * Režim pristupa — šta javnost sme da OTKRIJE.
 *
 *   public   ceo sadržaj je javan
 *   gated    postojanje je javno, telo je zaključano (javni pregled + CTA)
 *   private  postojanje nije javno; neautorizovan URL vraća 404
 *
 * Ovo NIJE mehanika naplate. Pretplata, kupovina i ručno odobrenje su izvori
 * prava pristupa (entitlement) i ne kodiraju se ovde.
 */
export const EDUCATION_ACCESS_MODES = ["public", "gated", "private"] as const;

/** Zatečeno dvočlano polje; ostaje samo radi migracije starih zapisa. */
export const EDUCATION_CONTENT_VISIBILITIES = ["public", "private"] as const;
export const EDUCATION_CONTENT_STATUSES = ["draft", "published"] as const;

export type EducationContentKind = (typeof EDUCATION_CONTENT_KINDS)[number];
export type EducationAccessMode = (typeof EDUCATION_ACCESS_MODES)[number];
export type EducationContentVisibility =
  (typeof EDUCATION_CONTENT_VISIBILITIES)[number];

/**
 * Zatečeni zapisi nemaju `accessMode`. Preslikavanje je fail-closed po duhu
 * ugovora: nepoznata vrednost nikada ne postaje javna.
 */
export function accessModeFromLegacyVisibility(
  visibility: unknown,
): EducationAccessMode {
  return visibility === "public" ? "public" : "private";
}

/** Jedini dozvoljen način da se pročita režim pristupa nekog zapisa. */
export function resolveAccessMode(record: {
  accessMode?: unknown;
  visibility?: unknown;
}): EducationAccessMode {
  const declared = record.accessMode;
  return typeof declared === "string" &&
    (EDUCATION_ACCESS_MODES as readonly string[]).includes(declared)
    ? (declared as EducationAccessMode)
    : accessModeFromLegacyVisibility(record.visibility);
}

/** Sme li javnost uopšte da zna da ovaj sadržaj postoji. */
export function isPubliclyDiscoverable(mode: EducationAccessMode): boolean {
  return mode === "public" || mode === "gated";
}

/** Sme li telo da ide neautorizovanom čitaocu. */
export function isBodyPubliclyReadable(mode: EducationAccessMode): boolean {
  return mode === "public";
}
export type EducationContentStatus =
  (typeof EDUCATION_CONTENT_STATUSES)[number];
