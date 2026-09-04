import { describe, expect, it } from "vitest";
import type { ContentBlock } from "@/lib/content/schemas/landing-blocks";
import {
  addBlock,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  moveBlockRelativeToVisible,
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

  it("dodaje usidreni blok na početak kada host to traži", () => {
    const result = addBlock([hero("a", 1), hero("b", 2)], "VideoBlock", {
      afterBlockId: "b",
      atStart: true,
      idFactory: () => "video",
    });

    expect(result.map(({ id, priority }) => ({ id, priority }))).toEqual([
      { id: "video", priority: 1 },
      { id: "a", priority: 2 },
      { id: "b", priority: 3 },
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

  /**
   * Filtriran prikaz: strelice predstavljaju ono što autor vidi, pa se zamena
   * radi sa prethodnim/sledećim VIDLJIVIM blokom. Preskočeni blokovi zadržavaju
   * svoj canonical slot.
   */
  describe("pomeranje u odnosu na vidljivi spisak", () => {
    const canonical = (): ContentBlock[] => [
      hero("articleA", 1),
      hero("download", 2),
      hero("articleB", 3),
    ];

    it("zamenjuje mesta sa sledećim vidljivim, ne sa canonical susedom", () => {
      const result = moveBlockRelativeToVisible(
        canonical(),
        ["articleA", "articleB"],
        "articleA",
        1,
      );

      expect(result.map(({ id }) => id)).toEqual([
        "articleB",
        "download",
        "articleA",
      ]);
    });

    it("preskočeni blok ostaje na svom canonical mestu i sa svojim id-jem", () => {
      const result = moveBlockRelativeToVisible(
        canonical(),
        ["articleA", "articleB"],
        "articleA",
        1,
      );

      expect(result[1]).toEqual(canonical()[1]);
      expect(result.map(({ id }) => id).sort()).toEqual(
        canonical()
          .map(({ id }) => id)
          .sort(),
      );
    });

    it("povratni potez vraća canonical redosled", () => {
      const source = canonical();
      const down = moveBlockRelativeToVisible(
        source,
        ["articleA", "articleB"],
        "articleA",
        1,
      );
      const back = moveBlockRelativeToVisible(
        down,
        ["articleB", "articleA"],
        "articleA",
        -1,
      );

      expect(back).toEqual(source);
    });

    it("normalizuje prioritete tačno jednom, po canonical redosledu", () => {
      const result = moveBlockRelativeToVisible(
        [hero("a", 4), hero("skip", 8), hero("b", 12)],
        ["a", "b"],
        "a",
        1,
      );

      expect(result.map(({ id, priority }) => ({ id, priority }))).toEqual([
        { id: "b", priority: 1 },
        { id: "skip", priority: 2 },
        { id: "a", priority: 3 },
      ]);
    });

    it("jedini vidljivi blok nema partnera i ne menja sadržaj", () => {
      const source = canonical();

      expect(
        moveBlockRelativeToVisible(source, ["articleA"], "articleA", 1),
      ).toEqual(source);
      expect(
        moveBlockRelativeToVisible(source, ["articleA"], "articleA", -1),
      ).toEqual(source);
    });

    it("blok van vidljivog spiska se ne pomera", () => {
      const source = canonical();

      expect(
        moveBlockRelativeToVisible(source, ["articleA", "articleB"], "download", -1),
      ).toEqual(source);
      expect(
        moveBlockRelativeToVisible(source, ["articleA", "articleB"], "download", 1),
      ).toEqual(source);
    });

    it("nefiltrirani spisak zadržava zamenu sa neposrednim susedom", () => {
      const source = canonical();
      const ids = source.map(({ id }) => id);

      expect(
        moveBlockRelativeToVisible(source, ids, "articleA", 1).map(
          ({ id }) => id,
        ),
      ).toEqual(["download", "articleA", "articleB"]);
      expect(moveBlock(source, "articleA", 1)).toEqual(
        moveBlockRelativeToVisible(source, ids, "articleA", 1),
      );
    });
  });
});
