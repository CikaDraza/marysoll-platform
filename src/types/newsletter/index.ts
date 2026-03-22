// src/types/newsletter/index.ts
// Centralizovani tipovi za newsletter i campaign funkcionalnosti

import { LayoutBlock } from "../conversational/layout";

// ============== CAMPAIGN TYPES ==============

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "paused"
  | "stopped";

export type CampaignType = "email-only" | "email-landing";

export type SemanticStatus = "empty" | "draft" | "approved" | "generated";

export type SemanticSource = "manual" | "ai" | "imported";

export type SemanticTone = "informative" | "friendly" | "urgent" | "premium";

export type LandingStatus = "pending" | "generated" | "published" | "failed";

// ============== SEO TYPES ==============

export interface LandingSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface SeoGenerationInput {
  titleSeed?: string;
  content: string;
  keywords?: string[];
}

// ============== LANDING PAGE TYPES ==============

export interface CampaignLandingPage {
  enabled: boolean;
  slug?: string;
  status: LandingStatus;
  generatedAt?: Date | string;
  regeneratedCount: number;
  layout?: LayoutBlock[];
  semanticType?: string;
  score?: number;
  seo?: LandingSeo;
}

// ============== SEMANTIC CONTENT TYPES ==============

export interface CampaignSemanticContent {
  status: SemanticStatus;
  source?: SemanticSource;
  intent: string;
  summary?: string;
  keyPoints?: string[];
  audience?: string;
  ctaGoal?: string;
  keywords?: string[];
  tone?: SemanticTone;
}

// ============== FORM/PAYLOAD TYPES ==============

export interface UpdateCampaignSemanticPayload {
  campaignType: CampaignType;
  semanticContent: {
    intent: string;
    summary: string;
    tone: SemanticTone;
    status?: SemanticStatus;
    source?: SemanticSource;
  };
  landingPage: {
    enabled?: boolean;
    slug: string;
  };
}

export interface PublishLandingPayload {
  layout: LayoutBlock[];
  seo?: LandingSeo;
  semanticType: string;
  generatedAt: string;
  status: LandingStatus;
  score?: number;
}

export interface SaveCampaignSemanticPayload {
  campaignType: CampaignType;
  semanticContent: CampaignSemanticContent;
  landingPage: {
    slug: string;
    layout?: LayoutBlock[];
    seo?: LandingSeo;
    score?: number;
    semanticType?: string;
    generatedAt?: Date | string;
    status: LandingStatus;
  };
}

// ============== PREVIEW TYPES ==============

export interface LandingPreviewResult {
  layout: LayoutBlock[];
  seo?: LandingSeo;
  score?: {
    total: number;
    breakdown: Record<string, number>;
  };
  meta?: {
    semanticType: string;
    generatedAt: Date;
  };
}

export interface PreviewState {
  isGeneratingLanding: boolean;
  isGeneratingSeo: boolean;
  landingReady: boolean;
  seoReady: boolean;
  error?: Error | null;
}

// ============== IMAGE TYPES ==============

export interface GeneratedImage {
  prompt: string;
  url: string;
  isGenerating: boolean;
}

export interface ImageGenerationResult {
  url: string;
  publicId?: string;
}

// ============== API RESPONSE TYPES ==============

export interface GenerateLandingResponse {
  landing: {
    hero: { title: string; subtitle?: string };
    heroVisual: { title: string; subtitle?: string; imagesUrl?: string[] };
    article: { title: string; content: string };
    contentSplit: { heading: string; content: string };
    features: Array<{ title: string; description: string }>;
    pricing?: Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      discount?: number;
      ctaLabel?: string;
      href?: string;
    }>;
    ctaSlug: { label: string; goal: string };
  } | null;
}

export interface GenerateSeoResponse {
  seo: LandingSeo;
}

export interface GenerateImageResponse {
  url: string;
  publicId?: string;
}

// ============== HOOK RETURN TYPES ==============

export interface UseLandingPreviewReturn {
  // State
  isGenerating: boolean;
  isGeneratingSeo: boolean;
  aiLanding: LandingPreviewResult | null;
  layout: LandingPreviewResult | null;
  error: Error | null;
  seoReady: boolean;
  layoutReady: boolean;

  // Actions
  generatePreview: () => Promise<LandingPreviewResult | null>;
  setPreviewFromExisting: (data: Partial<LandingPreviewResult>) => void;
  reset: () => void;
}

export interface UseGeneratedImagesReturn {
  images: GeneratedImage[];
  urls: string[];
  hasInvalid: boolean;
  isGenerating: boolean;

  // Actions
  generate: (index: number) => Promise<string | null>;
  updatePrompt: (index: number, value: string) => void;
  setUrl: (index: number, url: string) => void;
  add: (index: number) => void;
  remove: (index: number) => Promise<void>;
  reset: (urls?: string[]) => void;
  validateBeforePreview: () => boolean;
}

export interface UseSingleImageReturn {
  prompt: string;
  url: string;
  isGenerating: boolean;

  // Actions
  setPrompt: (value: string) => void;
  setUrl: (url: string) => void;
  generate: () => Promise<string | null>;
  reset: () => void;
}

export interface UseCampaignSemanticReturn {
  updateSemantic: (args: {
    campaignId: string;
    payload: UpdateCampaignSemanticPayload;
  }) => Promise<void>;
  saveCampaign: (args: {
    campaignId: string;
    payload: SaveCampaignSemanticPayload;
  }) => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}

export interface UsePublishLandingReturn {
  publishLanding: (args: {
    campaignId: string;
    payload: PublishLandingPayload;
  }) => Promise<void>;
  isPublishing: boolean;
  error: Error | null;
}
