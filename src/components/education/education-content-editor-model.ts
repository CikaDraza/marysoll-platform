import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import {
  EDUCATION_KIND_LABELS,
  EDUCATION_STATUS_LABELS,
  EDUCATION_VISIBILITY_LABELS,
  hasUnpublishedChanges,
  normalizeEducationSlug,
  type EducationContentRecord,
  type EducationContentSeo,
  type EducationContentSummary,
} from "@/lib/education/content-document";

export interface EducationEditorState {
  title: string;
  slug: string;
  /** Ručno potvrđen slug se ne prepisuje kad se naslov promeni. */
  slugTouched: boolean;
  kind: EducationContentSummary["kind"];
  visibility: EducationContentSummary["visibility"];
  blocks: ContentBlock[];
  seo: EducationContentSeo;
}

export function emptyEducationEditorState(): EducationEditorState {
  return {
    title: "",
    slug: "",
    slugTouched: false,
    kind: "article",
    visibility: "public",
    blocks: [],
    seo: {},
  };
}

export function editorStateFromRecord(
  record: EducationContentRecord,
): EducationEditorState {
  return {
    title: record.title,
    slug: record.slug,
    slugTouched: true,
    kind: record.kind,
    visibility: record.visibility,
    blocks: record.blocks,
    seo: record.seo ?? {},
  };
}

/** Prikaz web adrese dok zapis još nije sačuvan. */
export function previewSlug(state: EducationEditorState): string {
  return state.slugTouched && state.slug
    ? normalizeEducationSlug(state.slug)
    : normalizeEducationSlug(state.title);
}

export function isEducationEditorDirty(
  state: EducationEditorState,
  baseline: EducationEditorState | null,
): boolean {
  if (!baseline) {
    // Novi sadržaj je „prljav“ tek kad postoji nešto za čuvanje.
    return state.title.trim().length > 0 || state.blocks.length > 0;
  }
  return (
    state.title !== baseline.title ||
    normalizeEducationSlug(state.slug) !== normalizeEducationSlug(baseline.slug) ||
    state.kind !== baseline.kind ||
    state.visibility !== baseline.visibility ||
    JSON.stringify(state.seo) !== JSON.stringify(baseline.seo) ||
    JSON.stringify(state.blocks) !== JSON.stringify(baseline.blocks)
  );
}

export function createPayload(state: EducationEditorState) {
  return {
    title: state.title.trim(),
    slug: previewSlug(state) || undefined,
    kind: state.kind,
    visibility: state.visibility,
    blocks: state.blocks,
    seo: state.seo,
  };
}

/**
 * PATCH šalje samo ono što se stvarno promenilo. Slug ide samo kad ga je
 * vlasnica dirala — inače bi svaka izmena naslova tiho menjala web adresu.
 */
export function updatePayload(
  state: EducationEditorState,
  baseline: EducationEditorState,
) {
  const payload: Record<string, unknown> = {};
  if (state.title !== baseline.title) payload.title = state.title.trim();
  if (
    state.slugTouched &&
    normalizeEducationSlug(state.slug) !== normalizeEducationSlug(baseline.slug)
  ) {
    payload.slug = normalizeEducationSlug(state.slug);
  }
  if (state.kind !== baseline.kind) payload.kind = state.kind;
  if (state.visibility !== baseline.visibility) {
    payload.visibility = state.visibility;
  }
  if (JSON.stringify(state.seo) !== JSON.stringify(baseline.seo)) {
    payload.seo = state.seo;
  }
  if (JSON.stringify(state.blocks) !== JSON.stringify(baseline.blocks)) {
    payload.blocks = state.blocks;
  }
  return payload;
}

/** Stanje objave kakvo editor drži između odgovora servera. */
export interface EducationPublicationState {
  status: EducationContentSummary["status"];
  publishedSnapshot?: { publishedAt: string | Date } | null;
  workingSavedAt?: string | Date | null;
}

/**
 * Badge se računa iz dva servera vremena, ne iz poređenja blokova: Save piše
 * `workingSavedAt`, Publish piše `publishedSnapshot.publishedAt`.
 */
export function publicationLabel(state: EducationPublicationState): string {
  if (state.status !== "published" || !state.publishedSnapshot) return "Draft";
  return hasUnpublishedChanges(state)
    ? "Objavljeno · neobjavljene izmene"
    : "Objavljeno";
}

export function educationPublicationStateFromRecord(
  record: Pick<
    EducationContentRecord,
    "status" | "publishedSnapshot" | "workingSavedAt"
  >,
): EducationPublicationState {
  return {
    status: record.status,
    publishedSnapshot: record.publishedSnapshot ?? null,
    workingSavedAt: record.workingSavedAt ?? null,
  };
}

export interface EducationContentRow {
  id: string;
  title: string;
  slug: string;
  kindLabel: string;
  visibilityLabel: string;
  statusLabel: string;
  published: boolean;
  isPublic: boolean;
  updatedLabel: string;
  href: string;
}

export function educationContentRows(
  items: readonly EducationContentSummary[],
  formatDate: (value: string) => string,
): EducationContentRow[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title || "Bez naslova",
    slug: item.slug,
    kindLabel: EDUCATION_KIND_LABELS[item.kind] ?? item.kind,
    visibilityLabel: EDUCATION_VISIBILITY_LABELS[item.visibility],
    statusLabel: EDUCATION_STATUS_LABELS[item.status],
    published: item.status === "published",
    isPublic: item.visibility === "public",
    updatedLabel: item.updatedAt ? formatDate(item.updatedAt) : "",
    href: `/education/content/${item.id}`,
  }));
}
