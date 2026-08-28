import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import { AffiliateCTABlockEditor } from "./editors/AffiliateCTABlockEditor";
import { ArticleBlockEditor } from "./editors/ArticleBlockEditor";
import { ContentSplitBlockEditor } from "./editors/ContentSplitBlockEditor";
import { FeatureBlockEditor } from "./editors/FeatureBlockEditor";
import { HeroBlockEditor } from "./editors/HeroBlockEditor";
import { PricingBlockEditor } from "./editors/PricingBlockEditor";
import type { SlugOption } from "./types";

export function BlockFields({ block, slugOptions, onChange }: {
  block: ContentBlock;
  slugOptions: SlugOption[];
  onChange: (block: ContentBlock) => void;
}) {
  switch (block.type) {
    case "HeroBlock":
      return <HeroBlockEditor block={block} slugOptions={slugOptions} onChange={onChange} />;
    case "ArticleBlock":
      return <ArticleBlockEditor block={block} onChange={onChange} />;
    case "FeatureBlock":
      return <FeatureBlockEditor block={block} onChange={onChange} />;
    case "ContentSplitBlock":
      return <ContentSplitBlockEditor block={block} onChange={onChange} />;
    case "PricingBlock":
      return <PricingBlockEditor block={block} slugOptions={slugOptions} onChange={onChange} />;
    case "AffiliateCTABlock":
      return <AffiliateCTABlockEditor block={block} slugOptions={slugOptions} onChange={onChange} />;
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}
