import { describe, expect, it } from "vitest";
import { createDraftContentBlock } from "@/lib/content/editor/blockFactories";
import { validateContentBlock } from "./contentBlockValidation";
import { contentStatusPresentation } from "./contentValidationPresentation";

function presentation(type: Parameters<typeof createDraftContentBlock>[0]) {
  const validation = validateContentBlock(
    createDraftContentBlock(type, 1, () => `draft-${type}`),
  );
  return contentStatusPresentation(validation.status, validation.issues);
}

describe("actionable block validation presentation", () => {
  it("objašnjava nepotpun članak", () => {
    expect(presentation("ArticleBlock")).toMatchObject({
      label: "Potrebno je dopuniti",
      detail: "Unesite naslov sekcije.",
    });
  });

  it("objašnjava video bez izvora", () => {
    expect(presentation("VideoBlock").detail).toBe("Dodajte video.");
  });

  it("objašnjava download bez fajla", () => {
    const block = {
      ...createDraftContentBlock("FileDownloadBlock", 1, () => "file"),
      title: "Vodič",
    };
    const result = validateContentBlock(block);
    expect(contentStatusPresentation(result.status, result.issues).detail).toBe(
      "Dodajte fajl za preuzimanje.",
    );
  });

  it.each([
    ["ChecklistBlock", "Dodajte najmanje jednu stavku."],
    ["TableBlock", "Tabela nema kolone."],
    ["ImageGalleryBlock", "Galerija nema slike."],
  ] as const)("objašnjava prazan %s", (type, message) => {
    expect(presentation(type).detail).toBe(message);
  });

  it("VALID i HIDDEN zadržavaju svoje semantike bez upozorenja", () => {
    const valid = validateContentBlock({
      id: "article",
      type: "ArticleBlock",
      priority: 1,
      title: "Naslov",
      paragraphs: ["Tekst"],
    });
    expect(contentStatusPresentation(valid.status, valid.issues)).toEqual({
      label: "Spremno",
    });

    const hidden = validateContentBlock({
      ...createDraftContentBlock("VideoBlock", 1, () => "video"),
      visibility: "hidden",
    });
    expect(contentStatusPresentation(hidden.status, hidden.issues)).toEqual({
      label: "Sakriven",
    });
  });
});
