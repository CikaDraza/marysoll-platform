// lib/conversational/editor/aiToLayoutAdapter.ts

import { AICampaignResponse } from "@/types/conversational/ai-preview";
import { LandingBlock } from "@/types/landing-blocks";

export function transformAiToLayout(
  aiResponse: AICampaignResponse,
): LandingBlock[] {
  const blocks: LandingBlock[] = [];
  let priority = 1;

  // 1. Hero Primary
  if (aiResponse.hero) {
    blocks.push({
      id: "hero-primary",
      type: "HeroPrimaryBlock",
      priority: priority++,
      title: aiResponse.hero.title,
      subtitle: aiResponse.hero.subtitle,
      align: "center",
      size: "lg",
    });
  }

  // 2. Hero Visual
  if (aiResponse.heroVisual) {
    blocks.push({
      id: "hero-visual",
      type: "HeroVisualBlock",
      priority: priority++,
      title: aiResponse.heroVisual.title,
      subtitle: aiResponse.heroVisual.subtitle,
      imagesUrl: aiResponse.heroVisual.imagesUrl || [],
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
    });
  }

  // 5. Feature Grid
  if (aiResponse.features && Array.isArray(aiResponse.features)) {
    blocks.push({
      id: "features",
      type: "FeatureGridBlock",
      priority: priority++,
      features: aiResponse.features.map((f) => ({
        title: f.title,
        description: f.description,
      })),
    });
  }

  return blocks;
}
