// src/types/ai-preview.ts

export interface AICampaignResponse {
  hero: { title: string; subtitle?: string };
  heroVisual: { title: string; subtitle?: string; imagesUrl?: string[] };
  article: { title: string; content: string };
  contentSplit: { heading: string; content: string };
  features: Array<{ title: string; description: string }>;
}
