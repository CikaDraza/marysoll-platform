import { LandingBlock } from "@/types/landing-blocks";

/**
 * Extract plain text content from landing blocks.
 * Used for SEO generation, embeddings, and search indexing.
 */
export function extractTextFromBlocks(blocks: readonly LandingBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "HeroBlock":
        parts.push(block.title);
        if (block.subtitle) parts.push(block.subtitle);
        if (block.ctaLabel) parts.push(block.ctaLabel);
        break;

      case "ArticleBlock":
        parts.push(block.title, ...block.paragraphs);
        break;

      case "FeatureBlock":
        parts.push(block.title);
        if (block.intro) parts.push(block.intro);
        for (const section of block.sections) {
          parts.push(section.title, ...section.paragraphs);
          if (section.items) parts.push(...section.items);
        }
        break;

      case "ContentSplitBlock":
        parts.push(block.title, block.content);
        break;

      case "PricingBlock":
        parts.push(block.title);
        if (block.description) parts.push(block.description);
        for (const item of block.items) {
          parts.push(item.title);
          if (item.description) parts.push(item.description);
          if (item.features) parts.push(...item.features);
        }
        break;

      case "AffiliateCTABlock":
        if (block.eyebrow) parts.push(block.eyebrow);
        parts.push(block.title);
        if (block.description) parts.push(block.description);
        parts.push(block.ctaLabel);
        break;

      default: {
        const _exhaustive: never = block;
        return _exhaustive;
      }
    }
  }

  return parts
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n");
}
