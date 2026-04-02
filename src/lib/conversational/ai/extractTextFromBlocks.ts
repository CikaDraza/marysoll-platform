import { LandingBlock } from "@/types/landing-blocks";

/**
 * Extract plain text content from layout blocks
 * Used for:
 * - SEO generation
 * - embeddings
 * - search indexing
 */
export function extractTextFromBlocks(blocks: readonly LandingBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "HeroPrimaryBlock":
        parts.push(block.title);
        if (block.subtitle) parts.push(block.subtitle);
        if (block.ctaLabel) parts.push(block.ctaLabel);
        break;

      case "HeroVisualBlock":
        parts.push(block.title);
        if (block.subtitle) parts.push(block.subtitle);
        if (block.ctaLabel) parts.push(block.ctaLabel);
        break;

      case "ArticleSectionBlock":
        parts.push(block.title, block.content);
        break;

      case "FeatureGridBlock":
        for (const f of block.features) {
          parts.push(f.title, f.description);
        }
        break;

      case "CTABlock":
        parts.push(block.label);
        break;

      case "ContentSplitBlock":
        parts.push(block.heading, block.content);
        break;

      default: {
        const _exhaustive: never = block;
        return _exhaustive;
      }
    }
  }

  return parts
    .map((t) => t.trim())
    .filter(Boolean)
    .join("\n");
}
