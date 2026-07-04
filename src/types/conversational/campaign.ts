// src/lib/conversational/campaign/campaign.types.ts

import { INewsletterCampaign } from "..";
import { LayoutBlockPreview } from "./layout";
import { LayoutScoreResult } from "./layoutScore";
import {
  LandingBlock,
  LandingPageOutput,
  landingPageOutputSchema,
} from "@/types/landing-blocks";
import { CampaignSemanticContent, CampaignType } from "./semantic";

export const landingPreviewSchema = landingPageOutputSchema;

export interface CampaignLandingContent {
  blocks: LandingBlock[];
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

export type CampaignContent = LandingPageOutput;

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

// Enum živi u ./intent.ts (leaf) — re-export čuva postojeće importere,
// a semantic.ts importuje direktno iz ./intent pa nema kruga.
export { CampaignIntent } from "./intent";

export type BuildCampaignLayoutResult = {
  layout: LandingBlock[];
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
