import { LayoutBlock } from "@/types/conversational/layout";

function hasText(v?: string) {
  return Boolean(v && v.trim().length > 0);
}

function hasImages(arr?: string[]) {
  return Array.isArray(arr) && arr.length > 0 && Boolean(arr[0]);
}

function validHref(href?: string) {
  if (!href) return false;
  if (href === "#") return true;
  return /^\/|https?:\/\//.test(href);
}

export function sanitizeLayout(blocks: LayoutBlock[]): LayoutBlock[] {
  if (!blocks?.length) return [];

  const seenTypes = new Set<string>();

  const cleaned = blocks.filter((block) => {
    if (!block || !block.type) return false;

    switch (block.type) {
      // ---------- HERO ----------
      case "HeroPrimaryBlock":
        return hasText(block.title) || hasText(block.subtitle);

      // ---------- HERO VISUAL ----------
      case "HeroVisualBlock":
        return (
          hasImages(block.imagesUrl) &&
          (hasText(block.title) || hasText(block.subtitle))
        );

      // ---------- ARTICLE ----------
      case "ArticleSectionBlock":
        return hasText(block.title) || hasText(block.content);

      // ---------- SPLIT ----------
      case "ContentSplitBlock":
        return hasText(block.heading) || hasText(block.content);

      // ---------- FEATURES ----------
      case "FeatureGridBlock":
        return (
          Array.isArray(block.features) &&
          block.features.length > 0 &&
          block.features.some((f) => hasText(f.title))
        );

      // ---------- PRICING ----------
      case "PricingBlock":
        return Array.isArray(block.plans) && block.plans.length > 0;

      // ---------- CTA ----------
      case "CTABlock":
        return hasText(block.label) && validHref(block.href);

      default:
        return true;
    }
  });

  // ---------- REMOVE DUPLICATE SINGLETON BLOCKS ----------
  const deduped = cleaned.filter((block) => {
    const singleton = [
      "HeroPrimaryBlock",
      "HeroVisualBlock",
      "PricingBlock",
      "CTABlock",
    ];

    if (!singleton.includes(block.type)) return true;

    if (seenTypes.has(block.type)) return false;

    seenTypes.add(block.type);
    return true;
  });

  // ---------- SORT BY PRIORITY ----------
  deduped.sort((a, b) => a.priority - b.priority);

  // ---------- REINDEX PRIORITY ----------
  return deduped.map((block, i) => ({
    ...block,
    priority: i + 1,
  }));
}
