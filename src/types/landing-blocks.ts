import { z } from "zod";

export const landingBlockTypes = [
  "HeroBlock",
  "ArticleBlock",
  "FeatureBlock",
  "ContentSplitBlock",
  "PricingBlock",
  "AffiliateCTABlock",
] as const;

export type LandingBlockType = (typeof landingBlockTypes)[number];

export type BlockVisibility = "visible" | "hidden" | "minimized";
export type BlockAlign = "left" | "center" | "right";

export type LandingImage = {
  src: string;
  alt: string;
};

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
  href?: string;
  images?: LandingImage[];
}

export interface ArticleBlock extends LandingBlockBase {
  type: "ArticleBlock";
  title: string;
  paragraphs: string[];
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
  href: string;
  image?: LandingImage;
}

export type LandingBlock =
  | HeroBlock
  | ArticleBlock
  | FeatureBlock
  | ContentSplitBlock
  | PricingBlock
  | AffiliateCTABlock;

export interface LandingPageOutput {
  blocks: LandingBlock[];
}

const imageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
});

const blockBaseSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().min(1),
  visibility: z.enum(["visible", "hidden", "minimized"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  className: z.string().optional(),
});

export const heroBlockSchema = blockBaseSchema.extend({
  type: z.literal("HeroBlock"),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  href: z.string().optional(),
  images: z.array(imageSchema).optional(),
});

export const articleBlockSchema = blockBaseSchema.extend({
  type: z.literal("ArticleBlock"),
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
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
  href: z.string().min(1),
  image: imageSchema.optional(),
});

export const landingBlockSchema = z.discriminatedUnion("type", [
  heroBlockSchema,
  articleBlockSchema,
  featureBlockSchema,
  contentSplitBlockSchema,
  pricingBlockSchema,
  affiliateCtaBlockSchema,
]);

export const landingPageOutputSchema = z.object({
  blocks: z.array(landingBlockSchema).min(1),
});
