// src/lib/conversational/editor/buildCampaignLayout.ts
import { LayoutBlock, LayoutBlockPreview } from "@/types/conversational/layout";
import { sanitizeLayout } from "./sanitizeLayout";
import { scoreLayout } from "../layout-engine/scoreLayout";
import { INewsletterCampaign } from "@/types";
import { AICampaignResponse } from "@/types/conversational/ai-preview";

/**
 * TRANSFORMACIJA: Od AI objekta do Layout Engine nizova
 */
export function buildCampaignLayout(
  landing: AICampaignResponse,
  campaign: INewsletterCampaign,
  semanticType: string,
) {
  const layout: LayoutBlock[] = [];
  let priority = 1;
  const columns = 1;

  // Helper za slike
  function hasImages(arr?: string[]) {
    return Array.isArray(arr) && arr.length > 0 && Boolean(arr[0]);
  }

  // --- HERO ---
  if (
    landing.hero &&
    landing.heroVisual &&
    !hasImages(landing.heroVisual.imagesUrl)
  ) {
    layout.push({
      id: "hero",
      type: "HeroPrimaryBlock",
      priority: priority++,
      visibility: "visible",
      title: landing.hero.title,
      subtitle: landing.hero.subtitle,
      align: "center",
      size: "lg",
      href: "#",
    });
  }

  // --- HERO VISUAL ---
  if (landing.heroVisual && hasImages(landing.heroVisual.imagesUrl)) {
    layout.push({
      id: "hero-visual",
      type: "HeroVisualBlock",
      priority: priority++,
      visibility: "visible",
      title: landing.heroVisual.title,
      subtitle: landing.heroVisual.subtitle,
      imagesUrl: landing.heroVisual.imagesUrl || [],
      align: "center",
      size: "lg",
      href: "#",
    });
  }

  // --- ARTICLE ---
  if (landing.article?.content) {
    layout.push({
      id: "article",
      type: "ArticleSectionBlock",
      priority: priority++,
      visibility: "visible",
      title: landing.article.title,
      content: landing.article.content,
    });
  }

  // --- CONTENT SPLIT ---
  if (landing.contentSplit) {
    layout.push({
      id: "content-split",
      type: "ContentSplitBlock",
      priority: priority++,
      visibility: "visible",
      heading: landing.contentSplit.heading,
      content: landing.contentSplit.content,
    });
  }

  // --- FEATURES ---
  if (landing.features && landing.features.length > 0) {
    layout.push({
      id: "features",
      type: "FeatureGridBlock",
      priority: priority++,
      visibility: "visible",
      columns: columns,
      features: landing.features,
    });
  }

  // --- PRICING ---
  if (landing.pricing && landing.pricing.length > 0) {
    layout.push({
      id: "pricing",
      type: "PricingBlock",
      priority: priority++,
      visibility: "visible",
      plans: landing.pricing,
    });
  }

  // --- CTA ---
  if (landing.cta) {
    layout.push({
      id: "cta",
      type: "CTABlock",
      variant: "primary",
      label: landing.cta.label || "Zakaži termin",
      href: campaign.ctaSlug || "/termini",
      priority: priority++,
      visibility: "visible",
    });
  }

  const safeLayout = sanitizeLayout(layout);
  const resultScore = scoreLayout(safeLayout);

  return {
    layout: safeLayout,
    score: resultScore,
    meta: {
      semanticType,
      generatedAt: new Date(),
    },
  };
}
