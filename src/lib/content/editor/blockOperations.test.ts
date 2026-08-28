import { describe, expect, it } from "vitest";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import {
  addBlock,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  normalizePriorities,
  replaceBlock,
  toggleVisibility,
} from "./blockOperations";

const hero = (id: string, priority: number, title = id): ContentBlock => ({
  id,
  type: "HeroBlock",
  priority,
  title,
});

describe("Content Composer block operations", () => {
  it("dodaje prvi draft blok u prazan sadržaj", () => {
    const result = addBlock([], "ArticleBlock", { idFactory: () => "first" });

    expect(result).toEqual([
      {
        id: "first",
        type: "ArticleBlock",
        priority: 1,
        visibility: "visible",
        title: "",
        paragraphs: [""],
      },
    ]);
  });

  it("dodaje novi blok odmah iza selektovanog", () => {
    const result = addBlock(
      [hero("a", 1), hero("b", 2)],
      "ContentSplitBlock",
      { afterBlockId: "a", idFactory: () => "inserted" },
    );

    expect(result.map(({ id }) => id)).toEqual(["a", "inserted", "b"]);
    expect(result.map(({ priority }) => priority)).toEqual([1, 2, 3]);
  });

  it("pomera blok gore/dole i ne menja ulaz", () => {
    const source = [hero("a", 4), hero("b", 8), hero("c", 12)];
    const down = moveBlock(source, "a", 1);
    const up = moveBlock(down, "c", -1);

    expect(down.map(({ id }) => id)).toEqual(["b", "a", "c"]);
    expect(up.map(({ id }) => id)).toEqual(["b", "c", "a"]);
    expect(source.map(({ id, priority }) => ({ id, priority }))).toEqual([
      { id: "a", priority: 4 },
      { id: "b", priority: 8 },
      { id: "c", priority: 12 },
    ]);
  });

  it("duplikat dobija nov id, čuva duboki sadržaj i ide iza originala", () => {
    const source: ContentBlock[] = [
      {
        id: "feature",
        type: "FeatureBlock",
        priority: 1,
        title: "Rutina",
        sections: [{ title: "Korak", paragraphs: ["Tekst"] }],
      },
      hero("after", 2),
    ];
    const result = duplicateBlock(source, "feature", () => "copy");

    expect(result.map(({ id }) => id)).toEqual(["feature", "copy", "after"]);
    expect(result[1]).toMatchObject({
      type: "FeatureBlock",
      title: "Rutina",
      sections: [{ title: "Korak", paragraphs: ["Tekst"] }],
    });
    expect(result[1]).not.toBe(source[0]);
    if (result[1].type === "FeatureBlock" && source[0].type === "FeatureBlock") {
      expect(result[1].sections).not.toBe(source[0].sections);
    }
  });

  it("briše samo ciljani blok i normalizuje prioritete", () => {
    const result = deleteBlock(
      [hero("a", 5), hero("b", 7), hero("c", 9)],
      "b",
    );

    expect(result.map(({ id, priority }) => ({ id, priority }))).toEqual([
      { id: "a", priority: 1 },
      { id: "c", priority: 2 },
    ]);
  });

  it("hide/show čuva sav sadržaj bloka", () => {
    const source: ContentBlock[] = [
      {
        id: "article",
        type: "ArticleBlock",
        priority: 1,
        title: "Naslov",
        paragraphs: ["Jedan", "Dva"],
      },
    ];
    const hidden = toggleVisibility(source, "article");
    const visible = toggleVisibility(hidden, "article");

    expect(hidden[0]).toEqual({ ...source[0], visibility: "hidden" });
    expect(visible[0]).toEqual({ ...source[0], visibility: "visible" });
  });

  it("replace menja samo ciljani blok, a normalize daje 1..N", () => {
    const source = [hero("a", 10), hero("b", 20)];
    const replaced = replaceBlock(source, "b", hero("b", 20, "Novo"));

    expect(replaced.map((block) => block.title)).toEqual(["a", "Novo"]);
    expect(normalizePriorities(replaced).map(({ priority }) => priority)).toEqual([
      1, 2,
    ]);
  });
});
