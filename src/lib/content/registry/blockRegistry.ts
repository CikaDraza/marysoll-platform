import { BlockLandingTypeMap } from "@/lib/content/registry/block-landing-map";
import { ComponentType } from "react";
import HeroBlockView from "@/components/content-composer/blocks/HeroBlock";
import ArticleBlockView from "@/components/content-composer/blocks/ArticleBlock";
import FeatureBlockView from "@/components/content-composer/blocks/FeatureBlock";
import { ContentSplitBlockView } from "@/components/content-composer/blocks/ContentSplitBlock";
import PricingBlockView from "@/components/content-composer/blocks/PricingBlock";
import AffiliateCTABlockView from "@/components/content-composer/blocks/AffiliateCTABlock";

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
