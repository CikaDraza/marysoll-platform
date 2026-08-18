/**
 * Odluka „šta se renderuje" — normalan put i compat put.
 *
 * Posle T2A-FOLLOWUP normalizacije postoji SAMO normalan put: vidljivost sekcije
 * je postojanje bloka u dokumentu. Compat sloja (`LegacyAlwaysThemeBlock`) više
 * nema — testovi koji su ga čuvali obrisani su zajedno sa njim.
 */
import { describe, expect, it } from "vitest";
import type { ThemeDocument } from "@panta/theme-engine";
import { landingStructureToThemeDocument, sectionBlockId } from "@/lib/platform/theme-client";
import { THEME_COMPOSITIONS } from "@/lib/platform/theme-composition";
import type { ResolvedBlockMap } from "@/lib/platform/blocks/render-types";
import { findDocumentBlock, lookupThemeBlock } from "./selection";

const document: ThemeDocument = landingStructureToThemeDocument(undefined, {
  theme: "theme-5",
});

/** Podaci kakve bi ostavio server prolaz — sadržaj nije bitan za odluku. */
function dataFor(ids: string[]): ResolvedBlockMap {
  return Object.fromEntries(
    ids.map((id) => [
      id,
      {
        id,
        type: "content.hero",
        schemaVersion: 1,
        config: { source: "hero" },
        data: { content: undefined, salon: {} },
      },
    ]),
  ) as unknown as ResolvedBlockMap;
}

describe("normalan put: vidljivost = postojanje bloka", () => {
  it("nalazi blok po tipu", () => {
    expect(findDocumentBlock(document, "content.hero")?.id).toBe(
      sectionBlockId("hero"),
    );
  });

  it("renderuje kad blok postoji i ima podatke", () => {
    const result = lookupThemeBlock({
      document,
      type: "content.hero",
      data: dataFor([sectionBlockId("hero")]),
      theme: "theme-5",
    });
    expect(result.status).toBe("render");
  });

  it("ćuti kad bloka nema u dokumentu (sekcija ugašena)", () => {
    // blog je po defaultu isključen → adapter ga ne upisuje.
    expect(findDocumentBlock(document, "content.blog")).toBeUndefined();
    const result = lookupThemeBlock({
      document,
      type: "content.blog",
      data: dataFor([]),
      theme: "theme-5",
    });
    expect(result.status).toBe("absent");
  });

  it("prijavljuje kad blok postoji, a podataka nema", () => {
    const result = lookupThemeBlock({
      document,
      type: "content.hero",
      data: dataFor([]),
      theme: "theme-5",
    });
    expect(result).toMatchObject({
      status: "skip",
      event: { reason: "missing_data", type: "content.hero" },
    });
  });
});

describe("inventar više nema nijednu bezuslovnu sekciju", () => {
  it("nijedna tema ne renderuje CMS sekciju mimo njenog flaga", () => {
    for (const composition of THEME_COMPOSITIONS) {
      expect(
        composition.nodes.filter(
          (n) => n.kind === "cms-block" && n.conditional.startsWith("always"),
        ),
        composition.theme,
      ).toEqual([]);
    }
  });
});
