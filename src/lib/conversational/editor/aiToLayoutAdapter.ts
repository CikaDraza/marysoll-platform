// lib/conversational/editor/aiToLayoutAdapter.ts

import { AICampaignResponse } from "@/types/conversational/ai-preview";
import { Plan } from "@/types/conversational/blocks";
import { LayoutBlock } from "@/types/conversational/layout";

export function transformAiToLayout(
  aiResponse: AICampaignResponse,
): LayoutBlock[] {
  const blocks: LayoutBlock[] = [];
  let priority = 1;

  // 1. Hero Primary
  if (aiResponse.hero) {
    blocks.push({
      id: "hero-primary",
      type: "HeroPrimaryBlock",
      priority: priority++,
      title: aiResponse.hero.title,
      subtitle: aiResponse.hero.subtitle,
      visibility: "visible",
      align: "center",
      size: "lg",
    });
  }

  // 2. Hero Visual (AI često daje prazan imagesUrl, ovde to hendlujemo)
  if (aiResponse.heroVisual) {
    blocks.push({
      id: "hero-visual",
      type: "HeroVisualBlock",
      priority: priority++,
      title: aiResponse.heroVisual.title,
      subtitle: aiResponse.heroVisual.subtitle,
      imagesUrl: aiResponse.heroVisual.imagesUrl || [],
      visibility: "visible",
      align: "center",
      size: "lg",
    });
  }

  // 3. Article
  if (aiResponse.article) {
    blocks.push({
      id: "article",
      type: "ArticleSectionBlock",
      priority: priority++,
      title: aiResponse.article.title,
      content: aiResponse.article.content,
      visibility: "visible",
    });
  }

  // 4. Content Split
  if (aiResponse.contentSplit) {
    blocks.push({
      id: "content-split",
      type: "ContentSplitBlock",
      priority: priority++,
      heading: aiResponse.contentSplit.heading,
      content: aiResponse.contentSplit.content,
      visibility: "visible",
    });
  }

  // 5. Feature Grid
  if (aiResponse.features && Array.isArray(aiResponse.features)) {
    blocks.push({
      id: "features",
      type: "FeatureGridBlock",
      priority: priority++,
      columns: 3,
      features: aiResponse.features.map((f: any) => ({
        title: f.title,
        description: f.description,
      })),
      visibility: "visible",
    });
  }

  // 6. Pricing (Konverzija AI strukture u tvoju Plan[] strukturu)
  if (aiResponse.pricing && Array.isArray(aiResponse.pricing)) {
    const plans: Plan[] = aiResponse.pricing.map((p: Plan) => ({
      id: p.id || "standard",
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency || "RSD",
      discount: p.discount,
      ctaLabel: p.ctaLabel,
      href: p.href || "#",
    }));

    blocks.push({
      id: "pricing",
      type: "PricingBlock",
      priority: priority++,
      plans,
      visibility: "visible",
    });
  }

  // 7. CTA (cta iz AI-a u CTABlock)
  if (aiResponse.cta) {
    blocks.push({
      id: "cta-main",
      type: "CTABlock",
      priority: priority++,
      label: aiResponse.cta.label,
      href: "#", // Ovo se obično mapira na form.landingPage.slug kasnije
      variant: "primary",
      visibility: "visible",
    });
  }

  return blocks;
}
