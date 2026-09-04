import { z } from "zod";

export const landingBlockTypes = [
  "HeroBlock",
  "ArticleBlock",
  "FeatureBlock",
  "ContentSplitBlock",
  "PricingBlock",
  "AffiliateCTABlock",
  "VideoBlock",
  "TableBlock",
  "CalloutBlock",
  "ChecklistBlock",
  "FileDownloadBlock",
  "ImageGalleryBlock",
] as const;

export type LandingBlockType = (typeof landingBlockTypes)[number];

export type BlockVisibility = "visible" | "hidden";
export type BlockAlign = "left" | "center" | "right";

export type ContentAssetRef = {
  src: string;
  assetId?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

/**
 * Tačka kadra koju treba zadržati pri isecanju, u odnosu 0–1.
 *
 * Isti hero se na mobilnom seče kao 4/5 a na desktopu kao 3/1, pa bez ovoga
 * jedan od ta dva kadra uvek ispadne loše. `undefined` znači centar.
 */
export type ContentFocalPoint = { x: number; y: number };

export type ContentImageRef = ContentAssetRef & {
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  focalPoint?: ContentFocalPoint;
};

/** Backwards-compatible name for persisted Newsletter images. */
export type LandingImage = ContentImageRef;

export interface LandingBlockBase {
  id: string;
  type: LandingBlockType;
  priority: number;
  visibility?: BlockVisibility;
  align?: BlockAlign;
  className?: string;
}

export interface HeroBlock extends LandingBlockBase {
  type: "HeroBlock";
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  /** Catalog key chosen by the agent; resolved server-side into `href`. */
  ctaKey?: string;
  href?: string;
  images?: LandingImage[];
}

export interface ArticleBlock extends LandingBlockBase {
  type: "ArticleBlock";
  title: string;
  paragraphs: string[];
  /**
   * Prosto nabrajanje ispod pasusa.
   *
   * `ChecklistBlock` nije zamena: on crta kvačice i znači „proveri i odštikliraj".
   * Stručni tekst nabraja činjenice — koštana struktura, jagodične kosti, vilica
   * — i to je obična lista, ne zadatak.
   */
  items?: string[];
  image?: LandingImage;
}

export interface FeatureBlock extends LandingBlockBase {
  type: "FeatureBlock";
  title: string;
  intro?: string;
  sections: {
    title: string;
    paragraphs: string[];
    items?: string[];
    image?: LandingImage;
  }[];
}

export interface ContentSplitBlock extends LandingBlockBase {
  type: "ContentSplitBlock";
  title: string;
  content: string;
  image?: LandingImage;
  reverse?: boolean;
}

export interface PricingBlock extends LandingBlockBase {
  type: "PricingBlock";
  title: string;
  description?: string;
  items: {
    title: string;
    description?: string;
    price?: {
      amount: number;
      currency: "RSD" | "EUR";
    };
    features?: string[];
    /** Catalog key chosen by the agent; resolved server-side into `href`. */
    ctaKey?: string;
    href?: string;
    ctaLabel?: string;
    highlight?: "none" | "popular" | "bestValue";
  }[];
}

export interface AffiliateCTABlock extends LandingBlockBase {
  type: "AffiliateCTABlock";
  eyebrow?: string;
  title: string;
  description?: string;
  ctaLabel: string;
  /** Catalog key chosen by the agent; resolved server-side into `href`. */
  ctaKey?: string;
  href: string;
  image?: LandingImage;
}

export type VideoSource =
  | { provider: "youtube" | "vimeo"; url: string }
  | { provider: "upload"; media: ContentAssetRef };

export interface VideoBlock extends LandingBlockBase {
  type: "VideoBlock";
  source?: VideoSource;
  title?: string;
  caption?: string;
}

export interface TableBlock extends LandingBlockBase {
  type: "TableBlock";
  title?: string;
  caption?: string;
  columns: { id: string; label: string }[];
  rows: { id: string; cells: Record<string, string> }[];
}

export interface CalloutBlock extends LandingBlockBase {
  type: "CalloutBlock";
  variant: "info" | "tip" | "warning" | "important";
  title?: string;
  content: string;
}

export interface ChecklistBlock extends LandingBlockBase {
  type: "ChecklistBlock";
  title?: string;
  items: { id: string; text: string }[];
}

export interface FileDownloadBlock extends LandingBlockBase {
  type: "FileDownloadBlock";
  title: string;
  description?: string;
  file: ContentAssetRef | null;
  ctaLabel?: string;
}

export interface ImageGalleryBlock extends LandingBlockBase {
  type: "ImageGalleryBlock";
  title?: string;
  images: ({ id: string } & ContentImageRef)[];
}

export type LandingBlock =
  | HeroBlock
  | ArticleBlock
  | FeatureBlock
  | ContentSplitBlock
  | PricingBlock
  | AffiliateCTABlock
  | VideoBlock
  | TableBlock
  | CalloutBlock
  | ChecklistBlock
  | FileDownloadBlock
  | ImageGalleryBlock;

/**
 * Canonical shared Content Composer name. `LandingBlock` remains the persisted
 * Newsletter compatibility name; discriminants and stored documents are not
 * migrated by this alias.
 */
export type ContentBlock = LandingBlock;

export interface LandingPageOutput {
  blocks: LandingBlock[];
}

const nonBlankStringSchema = z.string().refine((value) => value.trim().length > 0, "Polje ne sme biti prazno");

export function isPersistableContentMediaSource(value: string): boolean {
  if (value.startsWith("/")) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const persistedUrlSchema = nonBlankStringSchema.refine(
  isPersistableContentMediaSource,
  "Media adresa mora biti trajni HTTP(S) ili relativni URL",
);

export const contentAssetRefSchema = z.object({
  src: persistedUrlSchema,
  assetId: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});

export const contentFocalPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const contentImageRefSchema = contentAssetRefSchema.extend({
  alt: nonBlankStringSchema,
  caption: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  focalPoint: contentFocalPointSchema.optional(),
});

const imageSchema = contentImageRefSchema;

export function isSupportedExternalVideoUrl(
  provider: "youtube" | "vimeo",
  value: string,
): boolean {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.replace(/^www\./, "");
    return provider === "youtube"
      ? ["youtube.com", "m.youtube.com", "youtu.be"].includes(host)
      : host === "vimeo.com" || host.endsWith(".vimeo.com");
  } catch {
    return false;
  }
}

const blockBaseSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().min(1),
  visibility: z.enum(["visible", "hidden"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  className: z.string().optional(),
});

export const heroBlockSchema = blockBaseSchema.extend({
  type: z.literal("HeroBlock"),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaKey: z.string().optional(),
  href: z.string().optional(),
  images: z.array(imageSchema).optional(),
});

export const articleBlockSchema = blockBaseSchema.extend({
  type: z.literal("ArticleBlock"),
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  items: z.array(z.string().min(1)).optional(),
  image: imageSchema.optional(),
});

export const featureBlockSchema = blockBaseSchema.extend({
  type: z.literal("FeatureBlock"),
  title: z.string().min(1),
  intro: z.string().optional(),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        paragraphs: z.array(z.string().min(1)).min(1),
        items: z.array(z.string().min(1)).optional(),
        image: imageSchema.optional(),
      }),
    )
    .min(1),
});

export const contentSplitBlockSchema = blockBaseSchema.extend({
  type: z.literal("ContentSplitBlock"),
  title: z.string().min(1),
  content: z.string().min(1),
  image: imageSchema.optional(),
  reverse: z.boolean().optional(),
});

export const pricingBlockSchema = blockBaseSchema.extend({
  type: z.literal("PricingBlock"),
  title: z.string().min(1),
  description: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        price: z
          .object({
            amount: z.number(),
            currency: z.enum(["RSD", "EUR"]),
          })
          .optional(),
        features: z.array(z.string().min(1)).optional(),
        ctaKey: z.string().optional(),
        href: z.string().optional(),
        ctaLabel: z.string().optional(),
        highlight: z.enum(["none", "popular", "bestValue"]).optional(),
      }),
    )
    .min(1),
});

export const affiliateCtaBlockSchema = blockBaseSchema.extend({
  type: z.literal("AffiliateCTABlock"),
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  ctaLabel: z.string().min(1),
  ctaKey: z.string().optional(),
  href: z.string().min(1),
  image: imageSchema.optional(),
});

const externalVideoSourceSchema = z
  .object({
    provider: z.enum(["youtube", "vimeo"]),
    url: persistedUrlSchema,
  })
  .superRefine((source, context) => {
    if (!isSupportedExternalVideoUrl(source.provider, source.url)) {
      context.addIssue({
        code: "custom",
        path: ["url"],
        message: `URL ne pripada ${source.provider} provideru`,
      });
    }
  });

export const videoBlockSchema = blockBaseSchema.extend({
  type: z.literal("VideoBlock"),
  source: z.union([
    externalVideoSourceSchema,
    z.object({ provider: z.literal("upload"), media: contentAssetRefSchema }),
  ]),
  title: z.string().optional(),
  caption: z.string().optional(),
});

export const tableBlockSchema = blockBaseSchema.extend({
  type: z.literal("TableBlock"),
  title: z.string().optional(),
  caption: z.string().optional(),
  columns: z.array(z.object({ id: z.string().min(1), label: nonBlankStringSchema })).min(1),
  rows: z.array(z.object({ id: z.string().min(1), cells: z.record(z.string(), nonBlankStringSchema) })).min(1),
}).superRefine((block, context) => {
  const columnIds = block.columns.map(({ id }) => id);
  if (new Set(columnIds).size !== columnIds.length) {
    context.addIssue({ code: "custom", path: ["columns"], message: "ID-jevi kolona moraju biti jedinstveni" });
  }
  const rowIds = block.rows.map(({ id }) => id);
  if (new Set(rowIds).size !== rowIds.length) {
    context.addIssue({ code: "custom", path: ["rows"], message: "ID-jevi redova moraju biti jedinstveni" });
  }
  block.rows.forEach((row, rowIndex) => {
    if (Object.keys(row.cells).length !== columnIds.length || columnIds.some((id) => !(id in row.cells))) {
      context.addIssue({ code: "custom", path: ["rows", rowIndex, "cells"], message: "Svaki red mora imati ćeliju za svaku kolonu" });
    }
  });
});

export const calloutBlockSchema = blockBaseSchema.extend({
  type: z.literal("CalloutBlock"),
  variant: z.enum(["info", "tip", "warning", "important"]),
  title: z.string().optional(),
  content: nonBlankStringSchema,
});

export const checklistBlockSchema = blockBaseSchema.extend({
  type: z.literal("ChecklistBlock"),
  title: z.string().optional(),
  items: z.array(z.object({ id: z.string().min(1), text: nonBlankStringSchema })).min(1),
}).superRefine((block, context) => {
  if (new Set(block.items.map(({ id }) => id)).size !== block.items.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "ID-jevi stavki moraju biti jedinstveni" });
  }
});

export const fileDownloadBlockSchema = blockBaseSchema.extend({
  type: z.literal("FileDownloadBlock"),
  title: nonBlankStringSchema,
  description: z.string().optional(),
  file: contentAssetRefSchema,
  ctaLabel: z.string().optional(),
});

export const imageGalleryBlockSchema = blockBaseSchema.extend({
  type: z.literal("ImageGalleryBlock"),
  title: z.string().optional(),
  images: z.array(contentImageRefSchema.extend({ id: z.string().min(1) })).min(1),
}).superRefine((block, context) => {
  if (new Set(block.images.map(({ id }) => id)).size !== block.images.length) {
    context.addIssue({ code: "custom", path: ["images"], message: "ID-jevi slika moraju biti jedinstveni" });
  }
});

export const landingBlockSchema = z.union([
  heroBlockSchema,
  articleBlockSchema,
  featureBlockSchema,
  contentSplitBlockSchema,
  pricingBlockSchema,
  affiliateCtaBlockSchema,
  videoBlockSchema,
  tableBlockSchema,
  calloutBlockSchema,
  checklistBlockSchema,
  fileDownloadBlockSchema,
  imageGalleryBlockSchema,
]);

export const landingPageOutputSchema = z.object({
  blocks: z.array(landingBlockSchema).min(1),
});

// ─── Relaxed schema for raw agent output ───────────────────────────────────────
// The agent emits a `ctaKey` instead of a destination URL, so for the final-CTA
// block `href`/`ctaLabel` are not yet present at parse time — the server-side
// resolver fills them from the CTA catalog before strict validation runs.
const affiliateCtaBlockAiSchema = affiliateCtaBlockSchema.extend({
  href: z.string().optional(),
  ctaLabel: z.string().optional(),
});

export const landingBlockAiSchema = z.discriminatedUnion("type", [
  heroBlockSchema,
  articleBlockSchema,
  featureBlockSchema,
  contentSplitBlockSchema,
  pricingBlockSchema,
  affiliateCtaBlockAiSchema,
]);

export const landingPageAiOutputSchema = z.object({
  blocks: z.array(landingBlockAiSchema).min(1),
});

export type LandingPageAiOutput = z.infer<typeof landingPageAiOutputSchema>;
