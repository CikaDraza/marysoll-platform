import { LayoutBlock } from "@/types/conversational/layout";

export function scoreStructure(layout: LayoutBlock[]): number {
  if (!layout.length) return 0;

  let score = 1;

  const types = layout.map((b) => b.type);

  const hasHero = types.includes("HeroPrimaryBlock");
  const hasCTA = types.includes("CTABlock");
  const hasContent = types.some((t) =>
    ["ArticleSectionBlock", "ContentSplitBlock"].includes(t),
  );

  if (!hasHero) score -= 0.4;
  if (!hasCTA) score -= 0.3;
  if (!hasContent) score -= 0.3;

  if (types[0] === "CTABlock") score -= 0.4;

  return clamp(score);
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
