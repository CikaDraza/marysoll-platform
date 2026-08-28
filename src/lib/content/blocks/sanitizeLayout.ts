import { LandingBlock } from "@/lib/content/schemas/landing-blocks";

function hasText(value?: string) {
  return Boolean(value && value.trim().length > 0);
}

function hasParagraphs(paragraphs?: string[]) {
  return Array.isArray(paragraphs) && paragraphs.some(hasText);
}

export function sanitizeLayout(blocks: LandingBlock[]): LandingBlock[] {
  if (!blocks?.length) return [];

  const cleaned = blocks.filter((block) => {
    if (!block || !block.type) return false;

    switch (block.type) {
      case "HeroBlock":
        return hasText(block.title) || hasText(block.subtitle);

      case "ArticleBlock":
        return hasText(block.title) && hasParagraphs(block.paragraphs);

      case "FeatureBlock":
        return (
          hasText(block.title) &&
          block.sections.some(
            (section) =>
              hasText(section.title) || hasParagraphs(section.paragraphs),
          )
        );

      case "ContentSplitBlock":
        return hasText(block.title) || hasText(block.content);

      case "PricingBlock":
        return hasText(block.title) && block.items.some((item) => hasText(item.title));

      case "AffiliateCTABlock":
        return hasText(block.title) && hasText(block.ctaLabel) && hasText(block.href);

      case "VideoBlock":
        return Boolean(block.source);
      case "TableBlock":
        return block.columns.length > 0 && block.rows.length > 0;
      case "CalloutBlock":
        return hasText(block.content);
      case "ChecklistBlock":
        return block.items.some((item) => hasText(item.text));
      case "FileDownloadBlock":
        return hasText(block.title) && hasText(block.file?.src);
      case "ImageGalleryBlock":
        return block.images.some((image) => hasText(image.src) && hasText(image.alt));

      default: {
        const _exhaustive: never = block;
        return _exhaustive;
      }
    }
  });

  const sorted = [...cleaned].sort((a, b) => a.priority - b.priority);

  return sorted.map((block, index) => ({
    ...block,
    priority: index + 1,
  }));
}
