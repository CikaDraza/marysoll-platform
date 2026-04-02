// app/lib/conversational/layout-engine/scoreLayout.ts
import { LayoutScoreResult } from "@/types/conversational/layoutScore";
import { scoreStructure } from "./scores/structure";
import { scoreReadability } from "./scores/readability";
import { scoreConversion } from "./scores/conversion";
import { scoreSemanticMatch } from "./scores/semantic";
import { scoreVisualBalance } from "./scores/visual";
import { LandingBlock } from "@/types/landing-blocks";

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
