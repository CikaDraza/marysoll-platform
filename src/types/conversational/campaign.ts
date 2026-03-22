// src/lib/conversational/campaign/campaign.types.ts

import { INewsletterCampaign } from "..";
import { LayoutBlock, LayoutBlockPreview } from "./layout";
import { LayoutScoreResult } from "./layoutScore";
import { CampaignSemanticContent, CampaignType } from "./semantic";
import { SchemaType, Schema } from "@google/generative-ai";

export const landingPreviewSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    hero: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        subtitle: { type: SchemaType.STRING },
      },
      required: ["title", "subtitle"],
    },
    heroVisual: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        subtitle: { type: SchemaType.STRING },
        imagesUrl: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: ["title", "subtitle", "imagesUrl"],
    },
    article: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        content: { type: SchemaType.STRING },
      },
      required: ["title", "content"],
    },
    contentSplit: {
      type: SchemaType.OBJECT,
      properties: {
        heading: { type: SchemaType.STRING },
        content: { type: SchemaType.STRING },
      },
      required: ["heading", "content"],
    },
    features: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
        },
        required: ["title", "description"],
      },
    },
    pricing: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING },
        name: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        price: { type: SchemaType.NUMBER },
        discount: { type: SchemaType.NUMBER },
        ctaLabel: { type: SchemaType.STRING },
        href: { type: SchemaType.STRING },
      },
      required: [
        "id",
        "name",
        "description",
        "price",
        "discount",
        "ctaLabel",
        "href",
      ],
    },
    ctaSlug: {
      type: SchemaType.OBJECT,
      properties: {
        label: { type: SchemaType.STRING },
        goal: { type: SchemaType.STRING },
      },
      required: ["label", "goal"],
    },
  },
  required: [
    "hero",
    "heroVisual",
    "article",
    "contentSplit",
    "features",
    "ctaSlug",
    "pricing",
  ],
};

export interface CampaignLandingContent {
  blocks: LayoutBlock[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
  score?: {
    total: number;
    breakdown: Record<string, number>;
  };
  semanticType?: string;
}

export interface CampaignContent {
  hero?: {
    type: "HeroPrimaryBlock";
    title: string;
    subtitle?: string;
  };
  heroVisual?: {
    type: "HeroVisualBlock";
    title: string;
    subtitle?: string;
    imagesUrl?: string[];
  };
  article?: {
    type: "ArticleSectionBlock";
    title: string;
    content: string;
  }[];
  features?: {
    type: "FeatureGridBlock";
    title: string;
    description: string;
  }[];
  contentSplit?: {
    type: "ContentSplitBlock";
    heading: string;
    content: string;
  };
  pricing?: {
    type: "PricingBlock";
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    discount?: number;
    ctaLabel?: string;
    href?: string;
  }[];
  cta?: {
    type: "CTABlock";
    ctaLabel: string;
    href: string;
  }[];
}

// Template Map
export type CampaignSemanticType =
  | "promotion"
  | "news"
  | "tips"
  | "events"
  | "birthday"
  | "education";

export const TemplateToCampaignType: Record<string, CampaignSemanticType> = {
  "default-promotions": "promotion",
  "default-news": "news",
  "default-tips": "tips",
  "default-events": "events",
  "default-birthday": "promotion",
};
// Template Map

export enum CampaignIntent {
  Promotion = "promotion",
  Education = "education",
  Tips = "tips",
  Announcement = "announcement",
  Event = "event",
  Conversion = "conversion",
}

export type BuildCampaignLayoutResult = {
  layout: LayoutBlock[];
  preview: LayoutBlockPreview[];
  score?: LayoutScoreResult;
  meta: {
    semanticType: CampaignSemanticType;
    usedDefaults: boolean;
    generatedAt: Date;
  };
};

export type PublicCampaignSnapshot = Pick<
  INewsletterCampaign,
  "status" | "ctaSlug" | "landingPage"
>;

export type SemanticPreviewOverride = Partial<
  Pick<CampaignSemanticContent, "intent" | "summary" | "tone">
>;

export type BuildCampaignLayoutInput = {
  /** Kampanja iz DB (kanonski izvor) */
  campaign: Pick<
    INewsletterCampaign,
    "_id" | "campaignType" | "ctaSlug" | "semanticContent" | "landingPage"
  >;

  /** Preview / UI override */
  semanticOverride?: {
    campaignType?: CampaignType;
    semanticContent?: SemanticPreviewOverride;
  };

  /** AI / admin landing preview */
  landingOverride?: CampaignLandingContent;

  context?: {
    source: "preview" | "publish" | "regenerate" | "optimizer";
    locale?: string;
    seed?: number;
  };
};
