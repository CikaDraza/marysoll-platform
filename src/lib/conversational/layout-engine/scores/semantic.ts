import { LandingBlock } from "@/types/landing-blocks";

export function scoreSemanticMatch(layout: LandingBlock[]): number {
  let score = 1;

  const types = layout.map((b) => b.type);

  if (types.includes("HeroVisualBlock") && !types.includes("HeroPrimaryBlock"))
    score -= 0.4;

  return clamp(score);
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
