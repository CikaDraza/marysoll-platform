import { BlockLandingTypeMap } from "@/lib/content/registry/block-landing-map";
import { ComponentType } from "react";
import type { BlockHeadingScope } from "@/components/content-composer/BlockList";
import HeroBlockView from "@/components/content-composer/blocks/HeroBlock";
import ArticleBlockView from "@/components/content-composer/blocks/ArticleBlock";
import FeatureBlockView from "@/components/content-composer/blocks/FeatureBlock";
import { ContentSplitBlockView } from "@/components/content-composer/blocks/ContentSplitBlock";
import PricingBlockView from "@/components/content-composer/blocks/PricingBlock";
import AffiliateCTABlockView from "@/components/content-composer/blocks/AffiliateCTABlock";
import VideoBlockView from "@/components/content-composer/blocks/VideoBlock";
import TableBlockView from "@/components/content-composer/blocks/TableBlock";
import CalloutBlockView from "@/components/content-composer/blocks/CalloutBlock";
import ChecklistBlockView from "@/components/content-composer/blocks/ChecklistBlock";
import FileDownloadBlockView from "@/components/content-composer/blocks/FileDownloadBlock";
import ImageGalleryBlockView from "@/components/content-composer/blocks/ImageGalleryBlock";

type BlockComponentMap = {
  [K in keyof BlockLandingTypeMap]: ComponentType<{
    block: BlockLandingTypeMap[K];
    headingScope?: BlockHeadingScope;
  }>;
};

export const blockRegistry = {
  HeroBlock: HeroBlockView,
  ArticleBlock: ArticleBlockView,
  FeatureBlock: FeatureBlockView,
  ContentSplitBlock: ContentSplitBlockView,
  PricingBlock: PricingBlockView,
  AffiliateCTABlock: AffiliateCTABlockView,
  VideoBlock: VideoBlockView,
  TableBlock: TableBlockView,
  CalloutBlock: CalloutBlockView,
  ChecklistBlock: ChecklistBlockView,
  FileDownloadBlock: FileDownloadBlockView,
  ImageGalleryBlock: ImageGalleryBlockView,
} satisfies BlockComponentMap;
