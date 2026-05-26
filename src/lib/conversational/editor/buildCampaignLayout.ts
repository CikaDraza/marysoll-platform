// src/lib/conversational/editor/buildCampaignLayout.ts
import { sanitizeLayout } from "./sanitizeLayout";
import { scoreLayout } from "../layout-engine/scoreLayout";
import { INewsletterCampaign } from "@/types";
import { LandingPageOutput } from "@/types/landing-blocks";
import { parseLandingPageOutput } from "./aiToLayoutAdapter";

/**
 * Validation boundary between AI output and renderable landing layout.
 */
export function buildCampaignLayout(
  landing: LandingPageOutput,
  _campaign: INewsletterCampaign,
  semanticType: string,
) {
  const parsed = parseLandingPageOutput(landing);
  const safeLayout = sanitizeLayout(parsed.blocks);
  const resultScore = scoreLayout(safeLayout);

  return {
    layout: safeLayout,
    score: resultScore,
    meta: {
      semanticType,
      generatedAt: new Date(),
    },
  };
}
