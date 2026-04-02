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
}

export interface EmailCampaignContent {
  subject: string;
  previewText: string;
  title: string;
  subtitle?: string;
  body: string;
  bullets?: string[];
  ctaText: string;
}

export interface EmailCampaignTemplate {
  html: string;
  blocks: EmailCampaignTemplateBlock[];
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
}
