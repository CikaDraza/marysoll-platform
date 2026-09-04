import { LandingBlock } from "@/lib/content/schemas/landing-blocks";

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

      case "VideoBlock":
        if (block.title) parts.push(block.title);
        if (block.caption) parts.push(block.caption);
        break;
      case "TableBlock":
        if (block.title) parts.push(block.title);
        parts.push(...block.columns.map(({ label }) => label));
        for (const row of block.rows) parts.push(...block.columns.map(({ id }) => row.cells[id] ?? ""));
        if (block.caption) parts.push(block.caption);
        break;
      case "CalloutBlock":
        if (block.title) parts.push(block.title);
        parts.push(block.content);
        break;
      case "ChecklistBlock":
        if (block.title) parts.push(block.title);
        parts.push(...block.items.map(({ text }) => text));
        break;
      case "FileDownloadBlock":
        parts.push(block.title);
        if (block.description) parts.push(block.description);
        if (block.file?.fileName) parts.push(block.file.fileName);
        break;
      case "ImageGalleryBlock":
        if (block.title) parts.push(block.title);
        for (const image of block.images) {
          parts.push(image.alt);
          if (image.caption) parts.push(image.caption);
        }
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
