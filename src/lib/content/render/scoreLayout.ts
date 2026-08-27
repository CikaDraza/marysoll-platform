// Shared content-composer layout scoring.
import { LayoutScoreResult } from "@/types/conversational/layoutScore";
import { scoreStructure } from "@/lib/conversational/layout-engine/scores/structure";
import { scoreReadability } from "@/lib/conversational/layout-engine/scores/readability";
import { scoreConversion } from "@/lib/conversational/layout-engine/scores/conversion";
import { scoreSemanticMatch } from "@/lib/conversational/layout-engine/scores/semantic";
import { scoreVisualBalance } from "@/lib/conversational/layout-engine/scores/visual";
import { LandingBlock } from "@/lib/content/schemas/landing-blocks";

export function scoreLayout(layout: LandingBlock[]): LayoutScoreResult {
  const structure = scoreStructure(layout);
  const readability = scoreReadability(layout);
  const conversion = scoreConversion(layout);
  const semantic = scoreSemanticMatch(layout);
  const visual = scoreVisualBalance(layout);

  const total =
    structure * 0.25 +
    readability * 0.2 +
    conversion * 0.25 +
    semantic * 0.15 +
    visual * 0.15;

  return {
    total: Number(total.toFixed(3)),
    breakdown: {
      structure,
      readability,
      conversion,
      semantic,
      visual,
    },
  };
}
