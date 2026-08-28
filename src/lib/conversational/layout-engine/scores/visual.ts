import { LandingBlock } from "@/types/landing-blocks";

export function scoreVisualBalance(layout: LandingBlock[]): number {
  let score = 1;

  const visualBlocks = layout.filter((block) => {
    switch (block.type) {
      case "HeroBlock":
        return Boolean(block.images?.length);
      case "ArticleBlock":
      case "ContentSplitBlock":
      case "AffiliateCTABlock":
        return Boolean(block.image);
      case "FeatureBlock":
        return block.sections.some((section) => Boolean(section.image));
      case "PricingBlock":
      case "TableBlock":
      case "CalloutBlock":
      case "ChecklistBlock":
      case "FileDownloadBlock":
        return false;
      case "VideoBlock":
        return Boolean(block.source);
      case "ImageGalleryBlock":
        return block.images.length > 0;
      default: {
        const _exhaustive: never = block;
        return _exhaustive;
      }
    }
  });

  if (visualBlocks.length === 0) score -= 0.4;
  if (visualBlocks.length > 3) score -= 0.2;

  return clamp(score);
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
