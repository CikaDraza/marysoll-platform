import { z } from "zod";
import { slugify } from "@/helpers/slugify";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import type { ContentDocumentValidation } from "@/lib/content/validation/contentBlockValidation";
import {
  EDUCATION_CONTENT_KINDS,
  EDUCATION_CONTENT_STATUSES,
  EDUCATION_CONTENT_VISIBILITIES,
  type EducationContentKind,
  type EducationContentStatus,
  type EducationContentVisibility,
} from "@/types/education-content";

export const EDUCATION_KIND_LABELS: Record<EducationContentKind, string> = {
  advice: "Savet",
  article: "Članak",
  guide: "Vodič",
  video: "Video",
  material: "Materijal",
};

export const EDUCATION_VISIBILITY_LABELS: Record<
  EducationContentVisibility,
  string
> = {
  public: "Javno",
  private: "Privatno",
};

export const EDUCATION_VISIBILITY_HELP: Record<
  EducationContentVisibility,
  string
> = {
  public: "Dostupno svima kada je sadržaj objavljen.",
  private:
    "Nije javno. Dostupnost konkretnim klijentima određuje se dodelom.",
};

export const EDUCATION_STATUS_LABELS: Record<EducationContentStatus, string> = {
  draft: "Draft",
  published: "Objavljeno",
};

/** Jedan zapis onako kako ga admin lista prikazuje. */
export interface EducationContentSummary {
  id: string;
  title: string;
  slug: string;
  kind: EducationContentKind;
  visibility: EducationContentVisibility;
  status: EducationContentStatus;
  updatedAt: string;
}

export interface EducationContentRecord extends EducationContentSummary {
  blocks: ContentBlock[];
  seo?: EducationContentSeo;
  /**
   * Poslednja objavljena verzija. Admin detalj je dobija BEZ blokova — editor
   * uređuje radnu kopiju, a javnu verziju samo prikazuje kao činjenicu.
   */
  publishedSnapshot?: EducationPublishedSnapshotMeta | null;
  workingSavedAt?: string | null;
  createdAt?: string;
}

/** Snapshot metadata koju admin editor vidi (bez blokova). */
export interface EducationPublishedSnapshotMeta {
  title: string;
  slug: string;
  kind: EducationContentKind;
  visibility: EducationContentVisibility;
  seo?: EducationContentSeo;
  publishedAt: string;
}

export interface EducationContentSeo {
  title?: string;
  description?: string;
  ogImage?: string;
}

const seoSchema = z.object({
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  ogImage: z.string().trim().max(2048).optional(),
});

const metadataSchema = z.object({
  title: z.string().trim().min(1, "Naslov je obavezan").max(200),
  slug: z.string().trim().max(200).optional(),
  kind: z.enum(EDUCATION_CONTENT_KINDS),
  visibility: z.enum(EDUCATION_CONTENT_VISIBILITIES),
  seo: seoSchema.optional(),
});

export const educationContentCreateSchema = metadataSchema;
export const educationContentUpdateSchema = metadataSchema.partial();

export type EducationContentCreateInput = z.infer<
  typeof educationContentCreateSchema
>;
export type EducationContentUpdateInput = z.infer<
  typeof educationContentUpdateSchema
>;

/**
 * Slug je host metadata, ne sadržaj bloka. Normalizacija je uvek serverska;
 * klijentski predlog je samo predlog.
 */
export function normalizeEducationSlug(value: string | undefined | null): string {
  if (!value) return "";
  return slugify(
    value
      .trim()
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/+/, ""),
  );
}

/**
 * Prazan slug se izvodi iz naslova. Ručno potvrđen slug se NE prepisuje samo
 * zato što se naslov promenio — pozivalac šalje slug tek kad ga stvarno menja.
 */
export function resolveEducationSlug(params: {
  requestedSlug?: string | null;
  title?: string | null;
  fallback?: string | null;
}): string {
  const requested = normalizeEducationSlug(params.requestedSlug);
  if (requested) return requested;

  const existing = normalizeEducationSlug(params.fallback);
  if (existing) return existing;

  return normalizeEducationSlug(params.title);
}

/** Host uslov objave: bar jedan vidljiv i kompletan blok. */
export function hasPublishableBlock(
  validation: ContentDocumentValidation,
): boolean {
  return validation.blocks.some(({ status }) => status === "VALID");
}

export function educationPublishHostFailure(
  validation: ContentDocumentValidation,
): ContentDocumentValidation {
  return {
    ...validation,
    valid: false,
    issues: [
      {
        blockId: "document",
        blockType: "document",
        path: "",
        code: "required_content",
        message:
          "Sadržaj mora imati najmanje jedan vidljiv i kompletan blok da bi bio objavljen",
        severity: "error",
      },
    ],
  };
}

/**
 * JAVNI IZVOR ISTINE = `publishedSnapshot`.
 *
 * Root polja su radna kopija i menjaju se pri svakom čuvanju, pa javna strana
 * NIKADA ne sme da ih čita — ni `status`, ni `visibility`, ni `blocks`, ni
 * `slug`. Zapis bez snapshot-a nije javan ni kada mu je `status` „published“
 * (zatečen zapis pre backfill-a ostaje nevidljiv umesto da procuri).
 */
export function hasPublishedSnapshot<T>(
  record: { publishedSnapshot?: T | null } | null | undefined,
): record is { publishedSnapshot: T } {
  return Boolean(record?.publishedSnapshot);
}

export function isPubliclyConsumable(
  record:
    | {
        publishedSnapshot?: { visibility: EducationContentVisibility } | null;
      }
    | null
    | undefined,
): boolean {
  return (
    hasPublishedSnapshot(record) &&
    record.publishedSnapshot.visibility === "public"
  );
}

/** Vraća objavljenu verziju za javni prikaz ili `null` — nikad radnu kopiju. */
export function resolvePublicEducationContent<
  TSnapshot extends { visibility: EducationContentVisibility },
>(
  record: { publishedSnapshot?: TSnapshot | null } | null | undefined,
): TSnapshot | null {
  return isPubliclyConsumable(record) ? record!.publishedSnapshot! : null;
}

/**
 * „Objavljeno · neobjavljene izmene“ — bez poređenja blokova.
 *
 * `workingSavedAt` piše samo Save, `publishedAt` samo Publish, pa je poređenje
 * dva servera vremena dovoljno i deterministično. `updatedAt` za ovo ne valja:
 * njega menja i sama objava.
 *
 * Poznata granica: ako bi se snimanje i objava desili u istoj milisekundi,
 * oznaka bi propustila izmenu. To je kozmetika (badge), ne gubitak podataka, i
 * zahteva dva upisa u razmaku manjem od milisekunde.
 */
export function hasUnpublishedChanges(record: {
  workingSavedAt?: string | Date | null;
  publishedSnapshot?: { publishedAt: string | Date } | null;
}): boolean {
  if (!record.publishedSnapshot) return false;
  if (!record.workingSavedAt) return false;
  return (
    new Date(record.workingSavedAt).getTime() >
    new Date(record.publishedSnapshot.publishedAt).getTime()
  );
}

/** Koliko starih adresa čuvamo; dovoljno za realnu upotrebu, a rast je ograničen. */
export const MAX_PUBLISHED_SLUG_HISTORY = 20;

/**
 * Istorija javnih adresa posle objave.
 *
 * U istoriju ulazi SAMO adresa koja je stvarno bila javno otkrivena — slug iz
 * radne kopije koji nikada nije objavljen nije imao javni URL, pa za njega ne
 * sme postojati preusmerenje. Nova kanonska adresa se iz istorije uklanja.
 */
export function nextPublishedSlugHistory(params: {
  previous?: {
    slug: string;
    visibility: EducationContentVisibility;
  } | null;
  history?: readonly string[] | null;
  nextSlug: string;
}): string[] {
  const history = [...(params.history ?? [])];
  const previous = params.previous;

  if (
    previous &&
    previous.visibility === "public" &&
    previous.slug &&
    previous.slug !== params.nextSlug
  ) {
    history.push(previous.slug);
  }

  return [...new Set(history)]
    .filter((slug) => slug && slug !== params.nextSlug)
    .slice(-MAX_PUBLISHED_SLUG_HISTORY);
}

/** Snapshot koji Publish upisuje — gradi se isključivo od sačuvane radne kopije. */
export function buildPublishedSnapshot(
  working: {
    title: string;
    slug: string;
    kind: EducationContentKind;
    visibility: EducationContentVisibility;
    blocks: unknown;
    seo?: EducationContentSeo | null;
  },
  publishedAt: Date,
) {
  return {
    title: working.title,
    slug: working.slug,
    kind: working.kind,
    visibility: working.visibility,
    blocks: Array.isArray(working.blocks) ? working.blocks : [],
    seo: working.seo ?? undefined,
    publishedAt,
  };
}

export function educationContentStatuses(): readonly EducationContentStatus[] {
  return EDUCATION_CONTENT_STATUSES;
}
