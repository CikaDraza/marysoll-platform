// src/types/conversational/blocks.ts
export type BlockVisibility = "visible" | "hidden" | "minimized";

export type BlockAlign = "left" | "center" | "right";

export type BlockSize = "xs" | "sm" | "md" | "lg";

export interface LayoutBlockBase {
  id: string;
  type: LayoutBlockType;
  priority: number;
  visibility?: BlockVisibility;
  className?: string;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  discount?: number;
  ctaLabel?: string;
  href: string;
}

/* ------------------------------------------------------------------ */
/*  Concrete blocks                                                    */
/* ------------------------------------------------------------------ */

export type HeroPrimaryBlock = LayoutBlockBase & {
  type: "HeroPrimaryBlock";
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  href?: string;
  align?: BlockAlign;
  size?: BlockSize;
};

export type HeroVisualBlock = LayoutBlockBase & {
  type: "HeroVisualBlock";
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  href?: string;
  align?: BlockAlign;
  size?: BlockSize;
  imagesUrl?: string[];
  variant?: "primary" | "secondary";
  imageURLs?: string[];
};

export type ArticleSectionBlock = LayoutBlockBase & {
  type: "ArticleSectionBlock";
  title: string;
  content: string;
};

export type FeatureGridBlock = LayoutBlockBase & {
  type: "FeatureGridBlock";
  columns: number;
  features: {
    title: string;
    description: string;
  }[];
};

export type PricingBlock = LayoutBlockBase & {
  type: "PricingBlock";
  plans: Plan[];
};

export type CTABlock = LayoutBlockBase & {
  type: "CTABlock";
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  align?: BlockAlign;
  size?: BlockSize;
};

export type ContentSplitBlock = LayoutBlockBase & {
  type: "ContentSplitBlock";
  heading: string;
  content: string;
};

/* ------------------------------------------------------------------ */
/*  Layout block identity                                              */
/* ------------------------------------------------------------------ */

export type LayoutBlockType =
  | "HeroPrimaryBlock"
  | "ArticleSectionBlock"
  | "FeatureGridBlock"
  | "CTABlock"
  | "HeroVisualBlock"
  | "ContentSplitBlock"
  | "PricingBlock";

export interface BaseBlock {
  id: string;
  type: string;
  priority: number;
  visibility?: BlockVisibility;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Public rendering policy                                            */
/* ------------------------------------------------------------------ */

export const PUBLIC_ALLOWED_BLOCKS = [
  "HeroPrimaryBlock",
  "HeroVisualBlock",
  "ArticleSectionBlock",
  "FeatureGridBlock",
  "CTABlock",
  "ContentSplitBlock",
] as const satisfies readonly LayoutBlockType[];

export type PublicAllowedBlock = (typeof PUBLIC_ALLOWED_BLOCKS)[number];
