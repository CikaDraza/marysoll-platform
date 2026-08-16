/**
 * Odluka „šta se renderuje" — normalan put i compat put.
 *
 * Ovde živi test koji je uslov iz odluke o T2A: `LegacyAlwaysThemeBlock` sme da
 * renderuje SAMO par (tema, sekcija) koji Composition Inventory označava kao
 * bezuslovan. Svaka druga upotreba se odbija, pa compat sloj ne može tiho da
 * poraste u „normalnu sposobnost sistema".
 */
import { describe, expect, it } from "vitest";
import type { ThemeDocument } from "@panta/theme-engine";
import { landingStructureToThemeDocument, sectionBlockId } from "@/lib/platform/theme-client";
import { legacyAlwaysSources } from "@/lib/platform/blocks/legacy-always";
import { THEME_COMPOSITIONS } from "@/lib/platform/theme-composition";
import type { ResolvedBlockMap } from "@/lib/platform/blocks/render-types";
import { findDocumentBlock, lookupLegacyAlwaysBlock, lookupThemeBlock } from "./selection";

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

describe("compat put: dozvoljen samo po inventaru", () => {
  const data = dataFor([
    sectionBlockId("appointmentSection"),
    sectionBlockId("testimonials"),
    sectionBlockId("faq"),
  ]);

  it("theme-5 + appointmentSection je dozvoljeno (jeste bezuslovna)", () => {
    const result = lookupLegacyAlwaysBlock({
      theme: "theme-5",
      scopeTheme: "theme-5",
      source: "appointmentSection",
      type: "booking.services",
      data,
    });
    expect(result.status).toBe("render");
  });

  it("theme-1 + appointmentSection se ODBIJA (theme-1 poštuje flag)", () => {
    const result = lookupLegacyAlwaysBlock({
      theme: "theme-1",
      scopeTheme: "theme-1",
      source: "appointmentSection",
      type: "booking.services",
      data,
    });
    expect(result).toMatchObject({
      status: "skip",
      event: { reason: "legacy_always_not_allowed" },
    });
  });

  it("theme-5 + faq se ODBIJA (nije u inventaru kao bezuslovna)", () => {
    expect(legacyAlwaysSources("theme-5")).not.toContain("faq");
    const result = lookupLegacyAlwaysBlock({
      theme: "theme-5",
      scopeTheme: "theme-5",
      source: "faq",
      type: "content.faq",
      data,
    });
    expect(result).toMatchObject({
      status: "skip",
      event: { reason: "legacy_always_not_allowed" },
    });
  });

  it("odbija kad se prop theme ne poklapa sa temom scope-a", () => {
    const result = lookupLegacyAlwaysBlock({
      theme: "theme-5",
      scopeTheme: "theme-2",
      source: "appointmentSection",
      type: "booking.services",
      data,
    });
    expect(result).toMatchObject({
      status: "skip",
      event: { reason: "legacy_always_not_allowed" },
    });
  });

  it("odbija kad type ne odgovara sekciji", () => {
    const result = lookupLegacyAlwaysBlock({
      theme: "theme-5",
      scopeTheme: "theme-5",
      source: "appointmentSection",
      type: "content.hero",
      data,
    });
    expect(result).toMatchObject({
      status: "skip",
      event: { reason: "legacy_always_not_allowed" },
    });
  });

  it("prijavljuje kad bezuslovna sekcija nije učitana u server prolazu", () => {
    const result = lookupLegacyAlwaysBlock({
      theme: "theme-2",
      scopeTheme: "theme-2",
      source: "hero",
      type: "content.hero",
      data: dataFor([]),
    });
    expect(result).toMatchObject({
      status: "skip",
      event: { reason: "missing_data" },
    });
  });
});

describe("allowlist se izvodi iz inventara, ne piše ručno", () => {
  it("poklapa se sa `conditional: always` iz Composition Inventara", () => {
    const fromInventory = Object.fromEntries(
      THEME_COMPOSITIONS.map((c) => [
        c.theme,
        c.nodes
          .filter((n) => n.kind === "cms-block" && n.conditional.startsWith("always"))
          .map((n) => (n as { source: string }).source),
      ]),
    );

    for (const composition of THEME_COMPOSITIONS) {
      expect(legacyAlwaysSources(composition.theme), composition.theme).toEqual(
        fromInventory[composition.theme],
      );
    }
  });

  it("danas ga koriste tačno tri teme", () => {
    const withCompat = THEME_COMPOSITIONS.map((c) => c.theme).filter(
      (theme) => legacyAlwaysSources(theme).length > 0,
    );
    expect(withCompat).toEqual(["theme-2", "theme-5", "theme-7"]);
  });

  it("nepoznata tema nema nijednu bezuslovnu sekciju", () => {
    expect(legacyAlwaysSources("theme-99")).toEqual([]);
  });
});
