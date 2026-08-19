/**
 * FeatureBlockRegistry — kontrakt i GRANICA.
 *
 * Najvažniji test u fajlu je poslednji: registry i engine ne smeju znati ništa
 * o tome koja tema ignoriše koji CMS flag. To je acceptance kriterijum T2A
 * koraka 4 — bez njega bi compatibility dug ušao u domen i tamo ostao.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateThemeDocument } from "@panta/theme-engine";
import type { ThemeDocument } from "@panta/theme-engine";
import {
  LANDING_LAYOUT_DEFINITION,
  SECTION_ORDER,
  blockTypeForSection,
  landingStructureToThemeDocument,
} from "../theme-client";
import { FEATURE_BLOCK_DEFINITIONS } from "./definitions";
import { FEATURE_BLOCK_REGISTRY, createFeatureBlockRegistry } from "./registry";
import type { FeatureBlockDefinition, FeatureBlockType } from "./types";

describe("registracija", () => {
  /** Deset blokova iz mapiranja spec 6 — osnovni skup svih tema 1–8. */
  const SPEC6_BLOCKS = [
    "booking.services",
    "content.about",
    "content.blog",
    "content.faq",
    "content.gallery",
    "content.hero",
    "content.perks",
    "content.team",
    "content.testimonials",
    "services.catalog",
  ];

  /**
   * theme-9 „Expert Editorial" autorske sekcije. Svi su `content.*` i svi imaju
   * `capability: null` — ako neki od njih ikad postane domenski (`education.*`),
   * mora istovremeno dobiti i capability, pa test ispod to i proverava.
   */
  const THEME9_BLOCKS = [
    "content.audience-paths",
    "content.credentials",
    "content.featured-education",
    "content.guided-care-process",
    "content.professional-path",
    "content.topic-hub",
  ];

  it("registruje spec-6 blokove i theme-9 autorske sekcije", () => {
    expect(FEATURE_BLOCK_DEFINITIONS).toHaveLength(
      SPEC6_BLOCKS.length + THEME9_BLOCKS.length,
    );
    expect(FEATURE_BLOCK_REGISTRY.types().sort()).toEqual(
      [...SPEC6_BLOCKS, ...THEME9_BLOCKS].sort(),
    );
  });

  it("nijedan domenski blok nema capability: null", () => {
    for (const def of FEATURE_BLOCK_DEFINITIONS) {
      if (def.type.startsWith("content.")) continue;
      // `services.catalog` i `booking.services` su T2A placeholderi (spec 9);
      // svaki NOVI domenski blok mora doći sa capability-jem.
      if (SPEC6_BLOCKS.includes(def.type)) continue;
      expect(def.capability, def.type).not.toBeNull();
    }
  });

  it("pokriva svaki tip koji adapter ume da napravi", () => {
    for (const key of SECTION_ORDER) {
      expect(
        FEATURE_BLOCK_REGISTRY.isKnownType(blockTypeForSection(key)),
        key,
      ).toBe(true);
    }
  });

  it("odbija dupli tip", () => {
    const [first] = FEATURE_BLOCK_DEFINITIONS;
    expect(() =>
      createFeatureBlockRegistry([
        first as FeatureBlockDefinition<FeatureBlockType>,
        first as FeatureBlockDefinition<FeatureBlockType>,
      ]),
    ).toThrow(/već registrovan/);
  });

  it("odbija definiciju bez schemaVersion", () => {
    const broken = {
      ...FEATURE_BLOCK_DEFINITIONS[0],
      schemaVersions: [] as number[],
    } as FeatureBlockDefinition<FeatureBlockType>;
    expect(() => createFeatureBlockRegistry([broken])).toThrow(/schemaVersion/);
  });

  it("svi blokovi su capability-neutralni (T2B non-goal)", () => {
    for (const def of FEATURE_BLOCK_DEFINITIONS) {
      expect(def.capability, def.type).toBeNull();
      expect(FEATURE_BLOCK_REGISTRY.capabilityFor(def.type)).toBeNull();
    }
  });
});

describe("schemaVersion", () => {
  it("podržava v1, ne podržava v2 ni v0", () => {
    expect(FEATURE_BLOCK_REGISTRY.supportsSchemaVersion("content.hero", 1)).toBe(true);
    expect(FEATURE_BLOCK_REGISTRY.supportsSchemaVersion("content.hero", 2)).toBe(false);
    expect(FEATURE_BLOCK_REGISTRY.supportsSchemaVersion("content.hero", 0)).toBe(false);
  });

  it("nepoznat tip nema nijednu podržanu verziju", () => {
    expect(FEATURE_BLOCK_REGISTRY.isKnownType("education.course")).toBe(false);
    expect(FEATURE_BLOCK_REGISTRY.supportsSchemaVersion("education.course", 1)).toBe(false);
  });
});

describe("config sheme", () => {
  const parse = (type: FeatureBlockType, config: unknown) =>
    FEATURE_BLOCK_REGISTRY.get(type)!.parseConfig(config);

  it("prihvata config koji adapter stvarno pravi", () => {
    expect(parse("content.hero", { source: "hero" }).ok).toBe(true);
    expect(
      parse("content.hero", { source: "hero", variant: "split-left-image" }).ok,
    ).toBe(true);
    expect(
      parse("content.gallery", {
        source: "gallery",
        galleryVariant: "images-with-category",
      }).ok,
    ).toBe(true);
  });

  it("odbija config iz pogrešne sekcije", () => {
    const result = parse("content.hero", { source: "about" });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("gallery bez varijante je neispravan config", () => {
    expect(parse("content.gallery", { source: "gallery" }).ok).toBe(false);
  });

  it("odbija nepoznatu hero varijantu", () => {
    expect(parse("content.hero", { source: "hero", variant: "diagonal" }).ok).toBe(
      false,
    );
  });
});

describe("BlockTypeResolver za engine", () => {
  const document = landingStructureToThemeDocument(undefined, { theme: "theme-1" });

  it("publish prolazi za dokument koji adapter napravi", () => {
    const result = validateThemeDocument(document, LANDING_LAYOUT_DEFINITION, {
      mode: "publish",
      resolver: FEATURE_BLOCK_REGISTRY,
    });
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("publish pada na nepoznatom tipu bloka, render ga samo preskoči", () => {
    const withUnknown: ThemeDocument = {
      ...document,
      sections: [
        ...document.sections,
        {
          id: "education",
          sectionType: "content",
          blocks: [
            {
              id: "education-block",
              type: "education.course",
              schemaVersion: 1,
              slot: "main",
              config: {},
            },
          ],
        },
      ],
    };

    const publish = validateThemeDocument(withUnknown, LANDING_LAYOUT_DEFINITION, {
      mode: "publish",
      resolver: FEATURE_BLOCK_REGISTRY,
    });
    expect(publish.ok).toBe(false);
    expect(publish.issues.map((i) => i.code)).toContain("unknown_block_type");

    const render = validateThemeDocument(withUnknown, LANDING_LAYOUT_DEFINITION, {
      mode: "render",
      resolver: FEATURE_BLOCK_REGISTRY,
    });
    expect(render.ok).toBe(true);
  });
});

/**
 * ACCEPTANCE (T2A korak 4):
 * „Legacy composition compatibility ne sme biti deo @panta/theme-engine niti
 *  FeatureBlockRegistry domena."
 *
 * Kompatibilnost sme da postoji samo u `legacy-always.ts` / `theme-render.ts` /
 * `LegacyAlwaysThemeBlock` — što znači da se briše bez diranja domena.
 */
describe("granica: domen ne zna za legacy kompoziciju", () => {
  const root = process.cwd();
  const DOMAIN_FILES = [
    "src/lib/platform/blocks/types.ts",
    "src/lib/platform/blocks/registry.ts",
    "src/lib/platform/blocks/definitions.ts",
    "src/lib/platform/blocks/resolve.ts",
    "packages/theme-engine/src/types.ts",
    "packages/theme-engine/src/validate.ts",
    "packages/theme-engine/src/lifecycle.ts",
    "packages/theme-engine/src/index.ts",
  ];

  const FORBIDDEN: [RegExp, string][] = [
    [/legacy/i, "pojam legacy kompatibilnosti"],
    [/unconditional/i, "allowlist bezuslovnih sekcija"],
    [/theme-composition/, "import Composition Inventara"],
    [/\btheme-[1-8]\b/, "znanje o konkretnoj temi"],
    [
      /\b(hero|about|artists|servicesPreview|appointment|testimonials|gallery|faq|blog|perks)Enabled\b/,
      "stari CMS flag",
    ],
  ];

  for (const file of DOMAIN_FILES) {
    it(`${file} je čist`, () => {
      const src = readFileSync(path.join(root, file), "utf8");
      for (const [pattern, what] of FORBIDDEN) {
        expect(pattern.test(src), `${file} sadrži ${what}`).toBe(false);
      }
    });
  }

  it("engine paket ne uvozi ništa iz aplikacije", () => {
    for (const file of DOMAIN_FILES.filter((f) => f.startsWith("packages/"))) {
      const src = readFileSync(path.join(root, file), "utf8");
      expect(src).not.toMatch(/from\s+"@\//);
      expect(src).not.toMatch(/from\s+"(react|next|mongoose|zod)"/);
    }
  });
});
