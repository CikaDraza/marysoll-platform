import {
  AffiliateCTABlock,
  ArticleBlock,
  ContentSplitBlock,
  FeatureBlock,
  HeroBlock,
  PricingBlock,
  VideoBlock,
  TableBlock,
  CalloutBlock,
  ChecklistBlock,
  FileDownloadBlock,
  ImageGalleryBlock,
} from "@/lib/content/schemas/landing-blocks";

export interface BlockLandingTypeMap {
  HeroBlock: HeroBlock;
  ArticleBlock: ArticleBlock;
  FeatureBlock: FeatureBlock;
  ContentSplitBlock: ContentSplitBlock;
  PricingBlock: PricingBlock;
  AffiliateCTABlock: AffiliateCTABlock;
  VideoBlock: VideoBlock;
  TableBlock: TableBlock;
  CalloutBlock: CalloutBlock;
  ChecklistBlock: ChecklistBlock;
  FileDownloadBlock: FileDownloadBlock;
  ImageGalleryBlock: ImageGalleryBlock;
}
