// src/types/ai-preview.ts

import { Plan } from "./blocks";

export interface AICampaignResponse {
  hero: { title: string; subtitle?: string };
  heroVisual: { title: string; subtitle?: string; imagesUrl?: string[] };
  article: { title: string; content: string };
  contentSplit: { heading: string; content: string };
  features: Array<{ title: string; description: string }>;
  pricing?: Plan[];
  cta: { label: string; goal: string };
}
