import type {
  ContentBlock,
  LandingBlockType,
} from "@/lib/content/schemas/landing-blocks";

export type ContentBlockIdFactory = () => string;

export function createContentBlockId(): string {
  return `content-block-${globalThis.crypto.randomUUID()}`;
}

/** Creates a structurally valid draft that is intentionally not publish-ready. */
export function createDraftContentBlock(
  type: LandingBlockType,
  priority: number,
  idFactory: ContentBlockIdFactory = createContentBlockId,
): ContentBlock {
  const base = {
    id: idFactory(),
    priority,
    visibility: "visible" as const,
  };

  switch (type) {
    case "HeroBlock":
      return { ...base, type, title: "" };
    case "ArticleBlock":
      return { ...base, type, title: "", paragraphs: [""] };
    case "FeatureBlock":
      return {
        ...base,
        type,
        title: "",
        sections: [{ title: "", paragraphs: [""] }],
      };
    case "ContentSplitBlock":
      return { ...base, type, title: "", content: "" };
    case "PricingBlock":
      return { ...base, type, title: "", items: [{ title: "" }] };
    case "AffiliateCTABlock":
      return { ...base, type, title: "", ctaLabel: "", href: "" };
    case "VideoBlock":
      return { ...base, type };
    case "TableBlock":
      return { ...base, type, columns: [], rows: [] };
    case "CalloutBlock":
      return { ...base, type, variant: "info", content: "" };
    case "ChecklistBlock":
      return { ...base, type, items: [] };
    case "FileDownloadBlock":
      return { ...base, type, title: "", file: null };
    case "ImageGalleryBlock":
      return { ...base, type, images: [] };
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}
