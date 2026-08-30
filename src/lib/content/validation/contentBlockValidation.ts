import { z, type ZodError } from "zod";
import {
  landingBlockSchema,
  isPersistableContentMediaSource,
  isSupportedExternalVideoUrl,
  type ContentBlock,
} from "@/lib/content/schemas/landing-blocks";

export type ContentBlockStatus = "VALID" | "INCOMPLETE" | "INVALID" | "HIDDEN";
export type ContentValidationMode = "draft" | "publish";
export type ContentValidationSeverity = "warning" | "error";

export interface ContentValidationIssue {
  blockId: string;
  blockType: string;
  path: string;
  code: "invalid_structure" | "required_content";
  message: string;
  severity: ContentValidationSeverity;
}

export interface ContentBlockValidation {
  blockId: string;
  blockType: string;
  status: ContentBlockStatus;
  issues: ContentValidationIssue[];
  /** Present whenever the value has a safe draft structure. */
  block?: ContentBlock;
}

export interface ContentDocumentValidation {
  mode: ContentValidationMode;
  valid: boolean;
  blocks: ContentBlockValidation[];
  issues: ContentValidationIssue[];
}

const draftMediaSourceSchema = z.string().refine(
  (value) => value === "" || isPersistableContentMediaSource(value),
  "Media adresa mora biti trajni HTTP(S) ili relativni URL",
);

const draftImageSchema = z.object({
  src: draftMediaSourceSchema,
  alt: z.string(),
  focalPoint: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
    .optional(),
  assetId: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  caption: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const draftAssetSchema = draftImageSchema.omit({ alt: true, caption: true, width: true, height: true });

const draftBaseSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().min(1),
  visibility: z.enum(["visible", "hidden"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  className: z.string().optional(),
});

const heroDraftSchema = draftBaseSchema.extend({
  type: z.literal("HeroBlock"),
  title: z.string(),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaKey: z.string().optional(),
  href: z.string().optional(),
  images: z.array(draftImageSchema).optional(),
});

const articleDraftSchema = draftBaseSchema.extend({
  type: z.literal("ArticleBlock"),
  title: z.string(),
  paragraphs: z.array(z.string()),
  image: draftImageSchema.optional(),
});

const featureDraftSchema = draftBaseSchema.extend({
  type: z.literal("FeatureBlock"),
  title: z.string(),
  intro: z.string().optional(),
  sections: z.array(
    z.object({
      title: z.string(),
      paragraphs: z.array(z.string()),
      items: z.array(z.string()).optional(),
      image: draftImageSchema.optional(),
    }),
  ),
});

const contentSplitDraftSchema = draftBaseSchema.extend({
  type: z.literal("ContentSplitBlock"),
  title: z.string(),
  content: z.string(),
  image: draftImageSchema.optional(),
  reverse: z.boolean().optional(),
});

const pricingDraftSchema = draftBaseSchema.extend({
  type: z.literal("PricingBlock"),
  title: z.string(),
  description: z.string().optional(),
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      price: z
        .object({
          amount: z.number(),
          currency: z.enum(["RSD", "EUR"]),
        })
        .optional(),
      features: z.array(z.string()).optional(),
      ctaKey: z.string().optional(),
      href: z.string().optional(),
      ctaLabel: z.string().optional(),
      highlight: z.enum(["none", "popular", "bestValue"]).optional(),
    }),
  ),
});

const affiliateCtaDraftSchema = draftBaseSchema.extend({
  type: z.literal("AffiliateCTABlock"),
  eyebrow: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  ctaLabel: z.string(),
  ctaKey: z.string().optional(),
  href: z.string(),
  image: draftImageSchema.optional(),
});

const videoDraftSchema = draftBaseSchema.extend({
  type: z.literal("VideoBlock"),
  source: z.union([
    z.object({
      provider: z.enum(["youtube", "vimeo"]),
      url: draftMediaSourceSchema,
    }),
    z.object({ provider: z.literal("upload"), media: draftAssetSchema }),
  ]).optional(),
  title: z.string().optional(),
  caption: z.string().optional(),
});

const tableDraftSchema = draftBaseSchema.extend({
  type: z.literal("TableBlock"),
  title: z.string().optional(),
  caption: z.string().optional(),
  columns: z.array(z.object({ id: z.string().min(1), label: z.string() })),
  rows: z.array(z.object({ id: z.string().min(1), cells: z.record(z.string(), z.string()) })),
});

const calloutDraftSchema = draftBaseSchema.extend({
  type: z.literal("CalloutBlock"),
  variant: z.enum(["info", "tip", "warning", "important"]),
  title: z.string().optional(),
  content: z.string(),
});

const checklistDraftSchema = draftBaseSchema.extend({
  type: z.literal("ChecklistBlock"),
  title: z.string().optional(),
  items: z.array(z.object({ id: z.string().min(1), text: z.string() })),
});

const fileDownloadDraftSchema = draftBaseSchema.extend({
  type: z.literal("FileDownloadBlock"),
  title: z.string(),
  description: z.string().optional(),
  file: draftAssetSchema.nullable(),
  ctaLabel: z.string().optional(),
});

const imageGalleryDraftSchema = draftBaseSchema.extend({
  type: z.literal("ImageGalleryBlock"),
  title: z.string().optional(),
  images: z.array(draftImageSchema.extend({ id: z.string().min(1) })),
});

/** Draft shape keeps block semantics while allowing required content to be empty. */
export const contentBlockDraftSchema = z.discriminatedUnion("type", [
  heroDraftSchema,
  articleDraftSchema,
  featureDraftSchema,
  contentSplitDraftSchema,
  pricingDraftSchema,
  affiliateCtaDraftSchema,
  videoDraftSchema,
  tableDraftSchema,
  calloutDraftSchema,
  checklistDraftSchema,
  fileDownloadDraftSchema,
  imageGalleryDraftSchema,
]).superRefine((block, context) => {
  switch (block.type) {
    case "TableBlock": {
      const columnIds = block.columns.map(({ id }) => id);
      if (new Set(columnIds).size !== columnIds.length) {
        context.addIssue({
          code: "custom",
          path: ["columns"],
          message: "ID-jevi kolona moraju biti jedinstveni",
        });
      }
      const rowIds = block.rows.map(({ id }) => id);
      if (new Set(rowIds).size !== rowIds.length) {
        context.addIssue({
          code: "custom",
          path: ["rows"],
          message: "ID-jevi redova moraju biti jedinstveni",
        });
      }
      block.rows.forEach((row, rowIndex) => {
        if (
          Object.keys(row.cells).length !== columnIds.length ||
          columnIds.some((id) => !(id in row.cells))
        ) {
          context.addIssue({
            code: "custom",
            path: ["rows", rowIndex, "cells"],
            message: "Svaki red mora imati ćeliju za svaku kolonu",
          });
        }
      });
      break;
    }
    case "ChecklistBlock":
      if (new Set(block.items.map(({ id }) => id)).size !== block.items.length) {
        context.addIssue({
          code: "custom",
          path: ["items"],
          message: "ID-jevi stavki moraju biti jedinstveni",
        });
      }
      break;
    case "ImageGalleryBlock":
      if (new Set(block.images.map(({ id }) => id)).size !== block.images.length) {
        context.addIssue({
          code: "custom",
          path: ["images"],
          message: "ID-jevi slika moraju biti jedinstveni",
        });
      }
      break;
    case "VideoBlock":
      if (
        block.source?.provider !== "upload" &&
        block.source?.url &&
        !isSupportedExternalVideoUrl(block.source.provider, block.source.url)
      ) {
        context.addIssue({
          code: "custom",
          path: ["source", "url"],
          message: `URL ne pripada ${block.source.provider} provideru`,
        });
      }
      break;
  }
});

function identityOf(value: unknown): { blockId: string; blockType: string } {
  if (!value || typeof value !== "object") {
    return { blockId: "unknown", blockType: "unknown" };
  }

  const record = value as Record<string, unknown>;
  return {
    blockId:
      typeof record.id === "string" && record.id.length > 0
        ? record.id
        : "unknown",
    blockType:
      typeof record.type === "string" && record.type.length > 0
        ? record.type
        : "unknown",
  };
}

function issuesFromZod(
  error: ZodError,
  identity: { blockId: string; blockType: string },
  kind: "invalid_structure" | "required_content",
): ContentValidationIssue[] {
  return error.issues.map((issue) => ({
    ...identity,
    path: issue.path.map(String).join("."),
    code: kind,
    message: issue.message,
    severity: kind === "invalid_structure" ? "error" : "warning",
  }));
}

/**
 * Returns publish readiness for one block. A safe draft can be INCOMPLETE;
 * malformed or unknown input is always INVALID, even when it claims to be hidden.
 */
export function validateContentBlock(value: unknown): ContentBlockValidation {
  const identity = identityOf(value);
  const draft = contentBlockDraftSchema.safeParse(value);

  if (!draft.success) {
    return {
      ...identity,
      status: "INVALID",
      issues: issuesFromZod(draft.error, identity, "invalid_structure"),
    };
  }

  const block = draft.data as ContentBlock;
  const strict = landingBlockSchema.safeParse(block);

  if (block.visibility === "hidden") {
    return {
      ...identity,
      status: "HIDDEN",
      block,
      issues: strict.success
        ? []
        : issuesFromZod(strict.error, identity, "required_content"),
    };
  }

  if (!strict.success) {
    return {
      ...identity,
      status: "INCOMPLETE",
      block,
      issues: issuesFromZod(strict.error, identity, "required_content"),
    };
  }

  return { ...identity, status: "VALID", block: strict.data, issues: [] };
}

export function validateContentDocument(
  values: unknown,
  mode: ContentValidationMode,
): ContentDocumentValidation {
  if (!Array.isArray(values)) {
    const issue: ContentValidationIssue = {
      blockId: "unknown",
      blockType: "document",
      path: "",
      code: "invalid_structure",
      message: "Content layout mora biti niz blokova",
      severity: "error",
    };
    return {
      mode,
      valid: false,
      blocks: [
        {
          blockId: "unknown",
          blockType: "document",
          status: "INVALID",
          issues: [issue],
        },
      ],
      issues: [issue],
    };
  }

  const blocks = values.map(validateContentBlock);
  const acceptable =
    mode === "draft"
      ? (status: ContentBlockStatus) => status !== "INVALID"
      : (status: ContentBlockStatus) =>
          status === "VALID" || status === "HIDDEN";

  return {
    mode,
    valid: blocks.every(({ status }) => acceptable(status)),
    blocks,
    issues: blocks.flatMap(({ issues }) => issues),
  };
}
