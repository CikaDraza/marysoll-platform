// ai-landing/src/types/block-registry.ts

import {
  ArticleSectionBlock,
  ContentSplitBlock,
  FeatureGridBlock,
  HeroPrimaryBlock,
  HeroVisualBlock,
} from "./landing-blocks";
import { CTABlock } from "./landing-blocks";

export interface BlockLandingTypeMap {
  HeroPrimaryBlock: HeroPrimaryBlock;
  HeroVisualBlock: HeroVisualBlock;
  ArticleSectionBlock: ArticleSectionBlock;
  FeatureGridBlock: FeatureGridBlock;
  ContentSplitBlock: ContentSplitBlock;
  CTABlock: CTABlock;
}
