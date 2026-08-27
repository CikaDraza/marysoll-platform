import {
  THEME9_FALLBACK_POLICY,
  isTheme9TristateSection,
  resolveSectionPresentation,
  resolveTheme9Section,
  type SectionFallbackPolicy,
} from "./presentationResolver";
import { THEME9_TRISTATE_SECTIONS } from "./sectionNormalization";
import {
  isSectionVisible,
  landingStructureToThemeDocument,
  enabledSectionKeys,
} from "@/lib/platform/theme-client";
import type { LandingStructure } from "@/types";

const authored = { enabled: undefined as boolean | undefined, headline: "Nega po meri" };
const empty = { enabled: undefined as boolean | undefined };

describe("resolveSectionPresentation — tri pravila, redosled je ugovor", () => {
  it("`false` je apsolutni veto — jači od sadržaja", () => {
    expect(
      resolveSectionPresentation({
        enabled: false,
        hasAuthoredContent: true,
        policy: "neutral",
      }),
    ).toBe("hidden");
  });

  it("`false` je jači i od `neutral` policy-ja", () => {
    expect(
      resolveSectionPresentation({
        enabled: false,
        hasAuthoredContent: false,
        policy: "neutral",
      }),
    ).toBe("hidden");
  });

  it("autorski sadržaj bez veta se uvek prikazuje, i bez odluke", () => {
    for (const enabled of [true, undefined]) {
      for (const policy of ["hide", "neutral"] as SectionFallbackPolicy[]) {
        expect(
          resolveSectionPresentation({
            enabled,
            hasAuthoredContent: true,
            policy,
          }),
        ).toBe("authored");
      }
    }
  });

  it("prazna sekcija bez veta pada na policy", () => {
    expect(
      resolveSectionPresentation({
        enabled: undefined,
        hasAuthoredContent: false,
        policy: "neutral",
      }),
    ).toBe("default");
    expect(
      resolveSectionPresentation({
        enabled: undefined,
        hasAuthoredContent: false,
        policy: "hide",
      }),
    ).toBe("hidden");
  });

  it("`true` + prazno takođe pada na policy — uključeno nije isto što i puno", () => {
    expect(
      resolveSectionPresentation({
        enabled: true,
        hasAuthoredContent: false,
        policy: "neutral",
      }),
    ).toBe("default");
    expect(
      resolveSectionPresentation({
        enabled: true,
        hasAuthoredContent: false,
        policy: "hide",
      }),
    ).toBe("hidden");
  });
});

describe("policy tabela", () => {
  it("pokriva tačno svih sedam sekcija", () => {
    expect(Object.keys(THEME9_FALLBACK_POLICY).sort()).toEqual(
      [...THEME9_TRISTATE_SECTIONS].sort(),
    );
  });

  it("2B.2 lands sve na `hide` — neutralni payload dolazi tek u 2B.3", () => {
    expect(
      Object.values(THEME9_FALLBACK_POLICY).every((p) => p === "hide"),
    ).toBe(true);
  });
});

describe("isTheme9TristateSection", () => {
  it("prepoznaje svih sedam", () => {
    for (const key of THEME9_TRISTATE_SECTIONS) {
      expect(isTheme9TristateSection(key)).toBe(true);
    }
  });

  it("ne hvata sekcije starijih tema", () => {
    for (const key of ["hero", "about", "blog", "gallery", "perks", "faq"]) {
      expect(isTheme9TristateSection(key)).toBe(false);
    }
  });
});

/**
 * Najvažniji test u fajlu: šta se promenilo u odnosu na zatečeno ponašanje.
 *
 * Zatečeno pravilo za sedam theme-9 sekcija bilo je `enabled ?? false`.
 * Ovde je svaka kombinacija ispisana, zajedno sa procenom rizika za dve koje
 * se razlikuju.
 */
describe("matrica: staro ponašanje vs 2B.2", () => {
  const KEY = "audiencePaths" as const;
  const oldVisible = (enabled: boolean | undefined) => enabled ?? false;
  const newVisible = (section: unknown) =>
    resolveTheme9Section(KEY, section) !== "hidden";

  const cases: {
    enabled: boolean | undefined;
    content: boolean;
    old: boolean;
    now: boolean;
    note: string;
  }[] = [
    { enabled: false, content: false, old: false, now: false, note: "isto" },
    { enabled: false, content: true, old: false, now: false, note: "isto — veto" },
    { enabled: true, content: true, old: true, now: true, note: "isto" },
    { enabled: undefined, content: false, old: false, now: false, note: "isto" },
    // ── dve razlike ────────────────────────────────────────────────────────
    {
      enabled: true,
      content: false,
      old: true,
      now: false,
      note: "RAZLIKA A — vizuelno identično: zatečeno je pravilo blok, ali theme-9 komponenta prazan sadržaj ionako ne renderuje",
    },
    {
      enabled: undefined,
      content: true,
      old: false,
      now: true,
      note: "RAZLIKA B — sadržaj koji postoji više ne nestaje samo zato što prekidač nije dodirnut; 0 pojava u bazi (2B.1 dry-run)",
    },
  ];

  for (const c of cases) {
    it(`enabled=${String(c.enabled)} sadržaj=${c.content} → staro=${c.old} novo=${c.now} · ${c.note}`, () => {
      const section = {
        ...(c.enabled === undefined ? {} : { enabled: c.enabled }),
        ...(c.content ? { headline: "Nega po meri" } : {}),
      };
      expect(oldVisible(c.enabled)).toBe(c.old);
      expect(newVisible(section)).toBe(c.now);
    });
  }

  it("razlika je tačno u dva slučaja, ne više", () => {
    expect(cases.filter((c) => c.old !== c.now)).toHaveLength(2);
  });
});

describe("sekcije starijih tema nisu dirnute", () => {
  const ls = (landing: Record<string, unknown>) =>
    ({ landing }) as unknown as LandingStructure;

  it("`hero` i `about` zadržavaju default `true`", () => {
    expect(isSectionVisible(ls({}), "hero")).toBe(true);
    expect(isSectionVisible(ls({}), "about")).toBe(true);
  });

  it("`blog` i `perks` zadržavaju default `false`", () => {
    expect(isSectionVisible(ls({}), "blog")).toBe(false);
    expect(isSectionVisible(ls({}), "perks")).toBe(false);
  });

  it("`blog` sa sadržajem ali bez `enabled` OSTAJE skriven — ne ide kroz theme-9 pravilo", () => {
    // Da je blog uvučen u tri-state ugovor, ovo bi postalo vidljivo i promenilo
    // ponašanje tema 1–8. Namerno nije.
    expect(isSectionVisible(ls({ blog: { headline: "Novosti" } }), "blog")).toBe(
      false,
    );
  });

  it("izričito `enabled: true` na legacy sekciji i dalje radi", () => {
    expect(isSectionVisible(ls({ blog: { enabled: true } }), "blog")).toBe(true);
  });
});

describe("landingStructureToThemeDocument", () => {
  const ls = (landing: Record<string, unknown>) =>
    ({ landing }) as unknown as LandingStructure;

  it("Marinin oblik (svih 7 `true` sa sadržajem) daje svih 7 blokova", () => {
    const landing: Record<string, unknown> = {};
    for (const key of THEME9_TRISTATE_SECTIONS) {
      landing[key] = { enabled: true, headline: "x" };
    }
    const keys = enabledSectionKeys(
      landingStructureToThemeDocument(ls(landing), { theme: "theme-9" }),
    );
    for (const key of THEME9_TRISTATE_SECTIONS) {
      expect(keys).toContain(key);
    }
  });

  it("prazan profil ne dobija nijednu od 7 sekcija", () => {
    const keys = enabledSectionKeys(
      landingStructureToThemeDocument(ls({}), { theme: "theme-9" }),
    );
    for (const key of THEME9_TRISTATE_SECTIONS) {
      expect(keys).not.toContain(key);
    }
  });

  it("izričito ugašena sekcija se ne renderuje ni kad ima sadržaj", () => {
    const keys = enabledSectionKeys(
      landingStructureToThemeDocument(
        ls({ topicHub: { enabled: false, headline: "Teme" } }),
        { theme: "theme-9" },
      ),
    );
    expect(keys).not.toContain("topicHub");
  });
});

describe("resolveTheme9Section — sirov CMS oblik", () => {
  it("`undefined` sekcija je prazna, ne pada", () => {
    expect(resolveTheme9Section("finalCta", undefined)).toBe("hidden");
  });

  it("niz umesto objekta se tretira kao prazno", () => {
    expect(resolveTheme9Section("finalCta", [])).toBe("hidden");
  });

  it("prihvata drugačiju policy tabelu", () => {
    const neutral = Object.fromEntries(
      THEME9_TRISTATE_SECTIONS.map((k) => [k, "neutral" as const]),
    ) as Record<(typeof THEME9_TRISTATE_SECTIONS)[number], SectionFallbackPolicy>;

    expect(resolveTheme9Section("finalCta", empty, neutral)).toBe("default");
    expect(resolveTheme9Section("finalCta", authored, neutral)).toBe("authored");
    expect(
      resolveTheme9Section("finalCta", { enabled: false }, neutral),
    ).toBe("hidden");
  });
});
