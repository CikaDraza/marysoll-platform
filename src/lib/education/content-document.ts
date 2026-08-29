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
} from "@/models/EducationContent";

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
  publishedAt?: string | null;
  createdAt?: string;
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
 * `published` NIJE javno. Javna konzumacija (UI-3) mora tražiti i status i
 * vidljivost — nikada samo status.
 */
export function isPubliclyConsumable(record: {
  status: EducationContentStatus;
  visibility: EducationContentVisibility;
}): boolean {
  return record.status === "published" && record.visibility === "public";
}

export function educationContentStatuses(): readonly EducationContentStatus[] {
  return EDUCATION_CONTENT_STATUSES;
}
