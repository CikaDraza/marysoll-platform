import { LandingBlock } from "@/types/landing-blocks";

export function scoreConversion(layout: LandingBlock[]): number {
  let score = 0.6;

  const order = layout.map((b) => b.type);

  const ctaIndex = order.indexOf("AffiliateCTABlock");
  const featureIndex = order.indexOf("FeatureBlock");

  if (ctaIndex !== -1) score += 0.2;
  if (ctaIndex > featureIndex && featureIndex !== -1) score += 0.2;

  return clamp(score);
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
