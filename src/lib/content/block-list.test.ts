import { describe, expect, it } from "vitest";
import { visibleContentBlocks } from "@/components/content-composer/BlockList";
import type { LandingBlock } from "@/lib/content/schemas/landing-blocks";

describe("BlockList render contract", () => {
  it("izostavlja hidden i stabilno sortira vidljive blokove po prioritetu", () => {
    const blocks: LandingBlock[] = [
      { id: "late", type: "HeroBlock", title: "Late", priority: 3 },
      {
        id: "hidden",
        type: "HeroBlock",
        title: "Hidden",
        priority: 1,
        visibility: "hidden",
      },
      { id: "early", type: "HeroBlock", title: "Early", priority: 2 },
    ];

    expect(visibleContentBlocks(blocks).map((block) => block.id)).toEqual([
      "early",
      "late",
    ]);
    expect(blocks.map((block) => block.id)).toEqual([
      "late",
      "hidden",
      "early",
    ]);
  });

  it("oba campaign renderera delegiraju istom BlockList-u bez ručnog switch-a", async () => {
    const { readFile } = await import("node:fs/promises");
    const [preview, campaign] = await Promise.all([
      readFile("src/components/content-composer/PreviewRenderer.tsx", "utf8"),
      readFile("src/components/layout/CampaignLayoutEngine.tsx", "utf8"),
    ]);
    expect(preview).toContain("<BlockList blocks={blocks} />");
    expect(campaign).toContain("<BlockList blocks={blocks} />");
    expect(preview).not.toContain("switch (block.type)");
    expect(campaign).not.toContain("switch (block.type)");
  });
});
