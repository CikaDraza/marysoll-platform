import { LandingBlock } from "@/types/landing-blocks";

export function scoreVisualBalance(layout: LandingBlock[]): number {
  let score = 1;

  const visualBlocks = layout.filter((b) =>
    ["HeroVisualBlock", "GalleryBlock"].includes(b.type),
  );

  if (visualBlocks.length === 0) score -= 0.4;
  if (visualBlocks.length > 3) score -= 0.2;

  return clamp(score);
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
