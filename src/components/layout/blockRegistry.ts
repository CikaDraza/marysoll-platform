import { BlockLandingTypeMap } from "@/types/block-landing-map";
import { ComponentType } from "react";
import HeroBlockView from "../blocks-ai/HeroBlock";
import ArticleBlockView from "../blocks-ai/ArticleBlock";
import FeatureBlockView from "../blocks-ai/FeatureBlock";
import { ContentSplitBlockView } from "../blocks-ai/ContentSplitBlock";
import PricingBlockView from "../blocks-ai/PricingBlock";
import AffiliateCTABlockView from "../blocks-ai/AffiliateCTABlock";

type BlockComponentMap = {
  [K in keyof BlockLandingTypeMap]: ComponentType<{
    block: BlockLandingTypeMap[K];
  }>;
};

export const blockRegistry = {
  HeroBlock: HeroBlockView,
  ArticleBlock: ArticleBlockView,
  FeatureBlock: FeatureBlockView,
  ContentSplitBlock: ContentSplitBlockView,
  PricingBlock: PricingBlockView,
  AffiliateCTABlock: AffiliateCTABlockView,
} satisfies BlockComponentMap;
