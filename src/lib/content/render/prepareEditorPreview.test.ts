import { describe, expect, it } from "vitest";
import { createDraftContentBlock } from "@/lib/content/editor/blockFactories";
import { prepareEditorPreview } from "./prepareEditorPreview";
import { visibleContentBlocks } from "@/components/content-composer/BlockList";

describe("Content Composer editor preview", () => {
  it("izostavlja hidden, renderuje validne po prioritetu i prijavljuje incomplete", () => {
    const incomplete = createDraftContentBlock("ArticleBlock", 2, () => "draft");
    const result = prepareEditorPreview([
      { id: "late", type: "HeroBlock", priority: 3, title: "Kasno" },
      { id: "hidden", type: "HeroBlock", priority: 1, title: "Sakriven", visibility: "hidden" },
      incomplete,
      { id: "early", type: "HeroBlock", priority: 2, title: "Rano" },
    ]);

    expect(visibleContentBlocks(result.blocks).map(({ id }) => id)).toEqual([
      "early",
      "late",
    ]);
    expect(result.unavailable).toEqual([
      expect.objectContaining({ blockId: "draft", status: "INCOMPLETE" }),
    ]);
  });

  it("incomplete i malformed draft ne bacaju grešku preview pripreme", () => {
    expect(() =>
      prepareEditorPreview([
        createDraftContentBlock("PricingBlock", 1, () => "pricing"),
        { id: "broken", type: "FeatureBlock", priority: 2, sections: "bad" },
      ]),
    ).not.toThrow();

    const result = prepareEditorPreview([
      createDraftContentBlock("PricingBlock", 1, () => "pricing"),
      { id: "broken", type: "FeatureBlock", priority: 2, sections: "bad" },
    ]);
    expect(result.blocks).toEqual([]);
    expect(result.unavailable.map(({ status }) => status)).toEqual([
      "INCOMPLETE",
      "INVALID",
    ]);
  });
});
