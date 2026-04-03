// types/email/block-email-campaign.ts
// Re-export canonical block type from AI campaign types.
// All block rendering must use this type.

export type {
  EmailCampaignTemplateBlock,
} from "@/types/ai/email-campaign/aiEmailCampaign.types";

// ─── Typed block data shapes ──────────────────────────────────────────────────
// These describe the `data` field for each block.type value.

export interface HeroBlockData {
  headline: string;
  subheadline?: string;
  backgroundUrl?: string;
  textColor?: string;
}

export interface TextBlockData {
  content: string;
  align?: "left" | "center" | "right";
}

export interface BulletsBlockData {
  items: string[];
  heading?: string;
}

export interface CtaBlockData {
  text: string;
  url?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface DividerBlockData {
  color?: string;
  thickness?: number;
}

export interface ImageBlockData {
  src: string;
  alt?: string;
  link?: string;
  width?: number;
}
