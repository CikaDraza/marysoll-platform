import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { LandingBlock } from "@/lib/content/schemas/landing-blocks";
import { sanitizeLayout } from "@/lib/content/blocks/sanitizeLayout";
import { scoreLayout } from "@/lib/content/render/scoreLayout";

const blocks: LandingBlock[] = [
  {
    id: "article",
    type: "ArticleBlock",
    priority: 30,
    title: "Članak",
    paragraphs: ["Tekst"],
  },
  {
    id: "hidden",
    type: "HeroBlock",
    priority: 1,
    visibility: "hidden",
    title: "Sakriven",
  },
  {
    id: "hero",
    type: "HeroBlock",
    priority: 20,
    title: "Hero",
  },
];

describe("F1 pre-refactor content contract", () => {
  it("sanitizeLayout odbacuje nevalidne blokove, sortira i normalizuje prioritete", () => {
    const invalid: LandingBlock = {
      id: "empty",
      type: "ArticleBlock",
      priority: 5,
      title: "",
      paragraphs: [],
    };

    expect(sanitizeLayout([...blocks, invalid]).map(({ id, priority }) => ({ id, priority }))).toEqual([
      { id: "hidden", priority: 1 },
      { id: "hero", priority: 2 },
      { id: "article", priority: 3 },
    ]);
  });

  it("scoreLayout zadržava stabilan ponderisani contract", () => {
    expect(scoreLayout(sanitizeLayout(blocks))).toMatchInlineSnapshot(`
      {
        "breakdown": {
          "conversion": 0.6,
          "readability": 1,
          "semantic": 0.6,
          "structure": 1,
          "visual": 0.6,
        },
        "total": 0.78,
      }
    `);
  });

  it("ručni editor, save i publish dele isti layout bez AI poziva", async () => {
    const source = await readFile(
      "src/components/admin/campaign/AdminSemanticModal.tsx",
      "utf8",
    );
    const manualStart = source.indexOf("{/* MANUAL EDITOR");
    const previewStart = source.indexOf("{/* PREVIEW */}", manualStart);
    const saveStart = source.indexOf("const handleSubmit");
    const publishStart = source.indexOf("const handlePublish", saveStart);
    const deleteStart = source.indexOf("const handleDeleteLanding", publishStart);
    const manualFlow = source.slice(manualStart, previewStart);
    const saveFlow = source.slice(saveStart, publishStart);
    const publishFlow = source.slice(publishStart, deleteStart);

    expect(manualFlow).toContain("preview.setPreviewFromExisting");
    expect(saveFlow).toContain("layout: preview.layout?.layout || []");
    expect(publishFlow).toContain("layout: preview.layout.layout");
    expect(`${manualFlow}${saveFlow}${publishFlow}`).not.toMatch(
      /generatePreview|generateSeo|landingPageAgent|callDeepSeek/,
    );
  });
});
