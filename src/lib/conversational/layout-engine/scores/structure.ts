import { LandingBlock } from "@/types/landing-blocks";

export function scoreStructure(layout: LandingBlock[]): number {
  if (!layout.length) return 0;

  let score = 1;

  const types = layout.map((b) => b.type);

  const hasHero = types.includes("HeroPrimaryBlock");
  const hasContent = types.some((t) =>
    ["ArticleSectionBlock", "ContentSplitBlock"].includes(t),
  );

  if (!hasHero) score -= 0.4;
  if (!hasContent) score -= 0.3;

  return clamp(score);
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
