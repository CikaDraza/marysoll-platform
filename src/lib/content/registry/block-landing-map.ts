import {
  AffiliateCTABlock,
  ArticleBlock,
  ContentSplitBlock,
  FeatureBlock,
  HeroBlock,
  PricingBlock,
} from "@/lib/content/schemas/landing-blocks";

export interface BlockLandingTypeMap {
  HeroBlock: HeroBlock;
  ArticleBlock: ArticleBlock;
  FeatureBlock: FeatureBlock;
  ContentSplitBlock: ContentSplitBlock;
  PricingBlock: PricingBlock;
  AffiliateCTABlock: AffiliateCTABlock;
}
