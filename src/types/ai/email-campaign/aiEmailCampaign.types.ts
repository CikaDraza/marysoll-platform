export type EmailCampaignTone =
  | "informative"
  | "friendly"
  | "urgent"
  | "luxury"
  | "seasonal";

export interface EmailCampaignInput {
  salonName: string;
  topic: string;
  audience?: string;
  tone: EmailCampaignTone;
}

export interface EmailCampaignStrategy {
  campaignGoal: string;
  suggestedSubjectLines: string[];
  previewTexts: string[];
  targetAudience: string;
  recommendedSendTime: string;
  reasoning?: string;
}

export interface EmailCampaignContent {
  subject: string;
  previewText: string;
  title: string;
  subtitle?: string;
  body: string;
  bullets?: string[];
  ctaText: string;
  /** Optional image prompt for AI image generation. Null means no image. */
  imagePrompt?: string | null;
}

export interface EmailCampaignTemplate {
  html: string;
  blocks: EmailCampaignTemplateBlock[];
  imageUrl?: string;
}

export interface EmailCampaignTemplateBlock {
  type: string;
  priority: number;
  data: Record<string, unknown>;
}

export interface EmailCampaignOptimization {
  improvedSubject: string;
  improvedPreview: string;
  expectedOpenRate: number;
  expectedClickRate: number;
  suggestions: string[];
  confidenceScore?: number;
}
