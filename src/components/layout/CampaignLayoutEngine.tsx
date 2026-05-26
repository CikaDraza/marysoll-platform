import { LandingBlock } from "@/types/landing-blocks";
import HeroBlock from "../blocks-ai/HeroBlock";
import ArticleBlock from "../blocks-ai/ArticleBlock";
import FeatureBlock from "../blocks-ai/FeatureBlock";
import { ContentSplitBlockView } from "../blocks-ai/ContentSplitBlock";
import PricingBlock from "../blocks-ai/PricingBlock";
import AffiliateCTABlock from "../blocks-ai/AffiliateCTABlock";

interface Props {
  blocks: LandingBlock[];
}

export function CampaignLayoutEngine({ blocks }: Props) {
  const visibleBlocks = [...blocks]
    .filter((block) => block.visibility !== "hidden")
    .sort((a, b) => a.priority - b.priority);

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-x-hidden px-1 pb-36 2xl:px-16">
      {visibleBlocks.map((block) => {
        switch (block.type) {
          case "HeroBlock":
            return <HeroBlock key={block.id} block={block} />;

          case "ArticleBlock":
            return <ArticleBlock key={block.id} block={block} />;

          case "FeatureBlock":
            return <FeatureBlock key={block.id} block={block} />;

          case "ContentSplitBlock":
            return <ContentSplitBlockView key={block.id} block={block} />;

          case "PricingBlock":
            return <PricingBlock key={block.id} block={block} />;

          case "AffiliateCTABlock":
            return <AffiliateCTABlock key={block.id} block={block} />;

          default:
            return null;
        }
      })}
    </main>
  );
}
