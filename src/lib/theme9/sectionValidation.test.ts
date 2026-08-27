import { choiceFromEnabled } from "./sectionDisplayChoice";
import { THEME9_TRISTATE_SECTIONS } from "./sectionNormalization";
import {
  theme9EditorSection,
  validateTheme9Sections,
  validateTheme9SectionsForTheme,
} from "./sectionValidation";
import type { LandingStructure } from "@/types";

const emptyLanding = {} as LandingStructure["landing"];

describe("missing Theme-9 CMS blok", () => {
  it("svih 7 ostaju Podrazumevano, bez synthetic enabled:true", () => {
    for (const section of THEME9_TRISTATE_SECTIONS) {
      const block = theme9EditorSection(emptyLanding, section);
      expect(choiceFromEnabled(block.enabled)).toBe("default");
      expect("enabled" in block).toBe(false);
    }
  });
});

describe("Theme-9 minimum content 7/7", () => {
  it("DEFAULT/ON blokira svih 7 praznih sekcija", () => {
    expect(validateTheme9Sections(emptyLanding).map((x) => x.section)).toEqual(
      THEME9_TRISTATE_SECTIONS,
    );
  });

  it("OFF prolazi prazan za svih 7", () => {
    const landing = Object.fromEntries(
      THEME9_TRISTATE_SECTIONS.map((key) => [key, { enabled: false }]),
    ) as unknown as LandingStructure["landing"];
    expect(validateTheme9Sections(landing)).toEqual([]);
  });

  it("prihvata minimalni renderable sadržaj svih 7", () => {
    const landing = {
      audiencePaths: { paths: [{ id: "p", title: "Za vas" }] },
      topicHub: { topics: [{ id: "t", title: "Barijera kože" }] },
      guidedCareProcess: { steps: [{ title: "Procena" }] },
      credentials: { pillars: [{ title: "Sertifikacija" }] },
      featuredEducation: { learn: ["Procena stanja kože"] },
      professionalPath: { formats: [{ title: "Radionica" }] },
      finalCta: { headline: "Započnimo", ctaLabel: "Otvorite zakazivanje" },
    } as LandingStructure["landing"];
    expect(validateTheme9Sections(landing)).toEqual([]);
  });

  it("prazni stringovi i prazni naslovi stavki nisu meaningful", () => {
    const landing = {
      audiencePaths: { paths: [{ id: "p", title: "  " }] },
      topicHub: { enabled: false },
      guidedCareProcess: { enabled: false },
      credentials: { enabled: false },
      featuredEducation: { enabled: false },
      professionalPath: { enabled: false },
      finalCta: { enabled: false },
    } as LandingStructure["landing"];
    expect(validateTheme9Sections(landing).map((x) => x.section)).toEqual([
      "audiencePaths",
    ]);
  });

  it("Final CTA ne zahteva niti proizvodi statične slotove", () => {
    const landing = Object.fromEntries(
      THEME9_TRISTATE_SECTIONS.map((key) => [key, { enabled: false }]),
    ) as unknown as LandingStructure["landing"];
    landing.finalCta = {
      headline: "Započnimo",
      ctaLabel: "Otvorite zakazivanje",
    };
    expect(validateTheme9Sections(landing)).toEqual([]);
  });
});

describe("legacy save granica", () => {
  it("prazne Theme-9 sekcije ne blokiraju teme 1–8", () => {
    for (let theme = 1; theme <= 8; theme += 1) {
      expect(
        validateTheme9SectionsForTheme(`theme-${theme}`, emptyLanding),
      ).toEqual([]);
    }
  });
});
