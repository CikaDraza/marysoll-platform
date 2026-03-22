import { CampaignIntent } from "@/types/conversational/campaign";
import { INewsletterCampaign } from "@/types";

export type CampaignType = "email-only" | "email-landing";

export type SemanticTone = "informative" | "friendly" | "urgent" | "premium";

export type SemanticStatus = "empty" | "draft" | "approved" | "generated";

export interface CampaignSemanticContent {
  status?: SemanticStatus;
  source?: "manual" | "ai" | "imported";
  intent: CampaignIntent;
  summary: string;
  tone: SemanticTone;
}

export interface CampaignLandingPageInput {
  enabled: boolean;
  slug?: string;
}

export interface UpdateCampaignSemanticPayload {
  campaignType: CampaignType;
  semanticContent: CampaignSemanticContent;
  landingPage: CampaignLandingPageInput;
}

export interface AdminSemanticModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: INewsletterCampaign;
}

export interface CampaignSemanticDraft {
  campaignType: "email-only" | "email-landing";

  semanticContent: {
    intent: CampaignIntent;
    summary: string;
    tone: SemanticTone;
    status: SemanticStatus;
  };

  landingPage: {
    enabled: boolean;
    slug?: string;
  };
}

export interface SemanticPreview {
  headline: string;
  subheadline?: string;
  ctaLabel: string;
}
