import { describe, expect, it } from "vitest";
import {
  educationAuthoringMode,
  educationNewEditorSeed,
  resolveEducationStartMode,
} from "./authoringStart";

const ids = (() => {
  let value = 0;
  return () => `start-${(value += 1)}`;
})();

describe("Education authoring start mode", () => {
  it.each(["article", "import", "video"] as const)(
    "prihvata whitelisted %s mode",
    (mode) => expect(resolveEducationStartMode(mode)).toBe(mode),
  );

  it.each([undefined, null, "", "guide", "ARTICLE", ["article"]])(
    "ne prihvata nepoznatu vrednost %j",
    (value) => expect(resolveEducationStartMode(value)).toBeNull(),
  );

  it("article odmah dobija canonical article preset", () => {
    const seed = educationNewEditorSeed("article", ids);
    expect(seed.kind).toBe("article");
    expect(seed.blocks.length).toBeGreaterThan(0);
    expect(seed.blocks[0].type).toBe("ArticleBlock");
  });

  it("import je članak bez konkurentskog preseta", () => {
    expect(educationNewEditorSeed("import", ids)).toEqual({
      kind: "article",
      blocks: [],
    });
  });

  it("video odmah dobija jedan primarni VideoBlock", () => {
    const seed = educationNewEditorSeed("video", ids);
    expect(seed.kind).toBe("video");
    expect(seed.blocks[0].type).toBe("VideoBlock");
    expect(seed.blocks.filter(({ type }) => type === "VideoBlock")).toHaveLength(1);
  });

  it.each(["advice", "article", "guide", "material"] as const)(
    "postojeći %s zapis ignoriše video start parametar bez konverzije",
    (kind) => expect(educationAuthoringMode({ kind }, "video")).toBe("article"),
  );

  it("postojeći video ostaje video i uz stale article parametar", () => {
    expect(educationAuthoringMode({ kind: "video" }, "article")).toBe("video");
  });
});
