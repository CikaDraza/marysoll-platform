import { z, type ZodError } from "zod";
import {
  landingBlockSchema,
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

const draftImageSchema = z.object({
  src: z.string(),
  alt: z.string(),
});

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

/** Draft shape keeps block semantics while allowing required content to be empty. */
export const contentBlockDraftSchema = z.discriminatedUnion("type", [
  heroDraftSchema,
  articleDraftSchema,
  featureDraftSchema,
  contentSplitDraftSchema,
  pricingDraftSchema,
  affiliateCtaDraftSchema,
]);

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
  values: readonly unknown[],
  mode: ContentValidationMode,
): ContentDocumentValidation {
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
