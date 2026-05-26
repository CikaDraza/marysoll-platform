import { LandingBlock } from "@/types/landing-blocks";

export function scoreReadability(layout: LandingBlock[]): number {
  let score = 1;

  const textBlocks = layout.filter((b) =>
    ["ArticleBlock", "FeatureBlock", "ContentSplitBlock"].includes(b.type),
  );

  if (textBlocks.length === 0) score -= 0.5;
  if (textBlocks.length > 3) score -= 0.3;

  return clamp(score);
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
