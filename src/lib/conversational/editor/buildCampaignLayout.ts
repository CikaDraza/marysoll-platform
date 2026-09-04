// src/lib/conversational/editor/buildCampaignLayout.ts
import { sanitizeLayout } from "@/lib/content/blocks/sanitizeLayout";
import { scoreLayout } from "@/lib/content/render/scoreLayout";
import { LandingPageOutput } from "@/types/landing-blocks";
import { parseLandingPageOutput } from "@/lib/content/schemas/parseLandingPageOutput";

/**
 * Validation boundary between AI output and renderable landing layout.
 */
export function buildCampaignLayout(
  landing: LandingPageOutput,
  ...args: [semanticType: string] | [legacyCampaign: unknown, semanticType: string]
) {
  // Three-argument form remains only as a temporary newsletter adapter. The
  // shared composer no longer depends on a campaign object.
  const semanticType = args.length === 1 ? args[0] : args[1];
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
