// components/email/EmailTemplateRenderer.tsx
// Renders an EmailCampaignTemplate as email-compatible HTML using block components.

"use client";

import type { EmailCampaignTemplate } from "@/types/ai/email-campaign/aiEmailCampaign.types";
import type {
  HeroBlockData,
  TextBlockData,
  BulletsBlockData,
  CtaBlockData,
  DividerBlockData,
  ImageBlockData,
} from "@/types/email/block-email-campaign";
import { HeroBlock } from "@/components/email-blocks/HeroBlock";
import { TextBlock } from "@/components/email-blocks/TextBlock";
import { BulletsBlock } from "@/components/email-blocks/BulletsBlock";
import { CtaBlock } from "@/components/email-blocks/CtaBlock";
import { DividerBlock } from "@/components/email-blocks/DividerBlock";
import { ImageBlock } from "@/components/email-blocks/ImageBlock";

interface Props {
  template: EmailCampaignTemplate;
  /** When true renders inside an iframe-like wrapper for preview purposes */
  preview?: boolean;
}

export function EmailTemplateRenderer({ template, preview = false }: Props) {
  const sortedBlocks = [...template.blocks].sort(
    (a, b) => a.priority - b.priority,
  );

  const content = (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      style={{
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
        borderCollapse: "collapse",
        backgroundColor: "#ffffff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <tbody>
        {sortedBlocks.map((block, idx) => (
          <tr key={`${block.type}-${idx}`}>
            <td>
              {renderBlock(block.type, block.data)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (preview) {
    return (
      <div className="bg-gray-100 rounded-xl p-4 overflow-auto">
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>{content}</div>
      </div>
    );
  }

  return content;
}

function renderBlock(type: string, data: Record<string, unknown>) {
  const d = data as unknown;
  switch (type) {
    case "hero":
      return <HeroBlock data={d as HeroBlockData} />;
    case "text":
      return <TextBlock data={d as TextBlockData} />;
    case "bullets":
      return <BulletsBlock data={d as BulletsBlockData} />;
    case "cta":
      return <CtaBlock data={d as CtaBlockData} />;
    case "divider":
      return <DividerBlock data={d as DividerBlockData} />;
    case "image":
      return <ImageBlock data={d as ImageBlockData} />;
    default:
      return null;
  }
}
