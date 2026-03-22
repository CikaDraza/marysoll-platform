import { BlockLandingTypeMap } from "@/types/block-landing-map";
import ArticleSectionBlockView from "../blocks-ai/ArticleSectionBlockView";
import { ContentSplitBlockView } from "../blocks-ai/ContentSplitBlockView";
import { CTABlockView } from "../blocks-ai/CTABlockView";
import FeatureGridBlockView from "../blocks-ai/FeatureGridBlockView";
import HeroPrimaryBlockView from "../blocks-ai/HeroPrimaryBlockView";
import HeroVisualBlockView from "../blocks-ai/HeroVisualBlockView";

type BlockComponentMap = {
  [K in keyof BlockLandingTypeMap]: React.ComponentType<{
    block: BlockLandingTypeMap[K];
  }>;
};

export const blockRegistry = {
  HeroPrimaryBlock: HeroPrimaryBlockView,
  HeroVisualBlock: HeroVisualBlockView,
  ArticleSectionBlock: ArticleSectionBlockView,
  FeatureGridBlock: FeatureGridBlockView,
  ContentSplitBlock: ContentSplitBlockView,
  CTABlock: CTABlockView,
} satisfies BlockComponentMap;
