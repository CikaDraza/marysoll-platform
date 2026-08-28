import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import { AffiliateCTABlockEditor } from "./editors/AffiliateCTABlockEditor";
import { ArticleBlockEditor } from "./editors/ArticleBlockEditor";
import { ContentSplitBlockEditor } from "./editors/ContentSplitBlockEditor";
import { FeatureBlockEditor } from "./editors/FeatureBlockEditor";
import { HeroBlockEditor } from "./editors/HeroBlockEditor";
import { PricingBlockEditor } from "./editors/PricingBlockEditor";
import type { SlugOption } from "./types";
import type { ContentMediaAuthoringAdapter } from "@/lib/content/media/authoring";
import { VideoBlockEditor } from "./editors/VideoBlockEditor";
import { TableBlockEditor } from "./editors/TableBlockEditor";
import { CalloutBlockEditor } from "./editors/CalloutBlockEditor";
import { ChecklistBlockEditor } from "./editors/ChecklistBlockEditor";
import { FileDownloadBlockEditor } from "./editors/FileDownloadBlockEditor";
import { ImageGalleryBlockEditor } from "./editors/ImageGalleryBlockEditor";

export function BlockFields({ block, slugOptions, mediaAdapter, onChange }: {
  block: ContentBlock;
  slugOptions: SlugOption[];
  mediaAdapter?: ContentMediaAuthoringAdapter;
  onChange: (block: ContentBlock) => void;
}) {
  switch (block.type) {
    case "HeroBlock":
      return <HeroBlockEditor block={block} slugOptions={slugOptions} mediaAdapter={mediaAdapter} onChange={onChange} />;
    case "ArticleBlock":
      return <ArticleBlockEditor block={block} mediaAdapter={mediaAdapter} onChange={onChange} />;
    case "FeatureBlock":
      return <FeatureBlockEditor block={block} mediaAdapter={mediaAdapter} onChange={onChange} />;
    case "ContentSplitBlock":
      return <ContentSplitBlockEditor block={block} mediaAdapter={mediaAdapter} onChange={onChange} />;
    case "PricingBlock":
      return <PricingBlockEditor block={block} slugOptions={slugOptions} onChange={onChange} />;
    case "AffiliateCTABlock":
      return <AffiliateCTABlockEditor block={block} slugOptions={slugOptions} mediaAdapter={mediaAdapter} onChange={onChange} />;
    case "VideoBlock":
      return <VideoBlockEditor block={block} mediaAdapter={mediaAdapter} onChange={onChange} />;
    case "TableBlock":
      return <TableBlockEditor block={block} onChange={onChange} />;
    case "CalloutBlock":
      return <CalloutBlockEditor block={block} onChange={onChange} />;
    case "ChecklistBlock":
      return <ChecklistBlockEditor block={block} onChange={onChange} />;
    case "FileDownloadBlock":
      return <FileDownloadBlockEditor block={block} mediaAdapter={mediaAdapter} onChange={onChange} />;
    case "ImageGalleryBlock":
      return <ImageGalleryBlockEditor block={block} mediaAdapter={mediaAdapter} onChange={onChange} />;
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}
