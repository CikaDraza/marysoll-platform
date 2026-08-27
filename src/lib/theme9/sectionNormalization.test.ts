import {
  THEME9_TRISTATE_SECTIONS,
  hasMeaningfulContent,
  classifySection,
  classifyProfile,
} from "./sectionNormalization";

/** Realan oblik sekcije iz Mongo-a kad je vlasnica nešto napisala. */
const authoredAudiencePaths = {
  enabled: false,
  eyebrow: "Za koga je",
  headline: "Nega po meri",
  lead: "",
  paths: [{ _id: "aaa", title: "Osetljiva koža", text: "Umirivanje barijere" }],
};

/** Oblik koji je napravio SAMO Mongoose default — nijedno autorsko polje. */
const untouchedAudiencePaths = {
  enabled: false,
  paths: [],
};

describe("hasMeaningfulContent", () => {
  it("prazan objekat nema sadržaja", () => {
    expect(hasMeaningfulContent({})).toBe(false);
  });

  it("sam `enabled` se NE broji kao sadržaj", () => {
    expect(hasMeaningfulContent({ enabled: true })).toBe(false);
    expect(hasMeaningfulContent({ enabled: false })).toBe(false);
  });

  it("prazan niz nije sadržaj", () => {
    expect(hasMeaningfulContent({ enabled: false, paths: [] })).toBe(false);
  });

  it("prazan string i sami razmaci nisu sadržaj", () => {
    expect(hasMeaningfulContent({ headline: "" })).toBe(false);
    expect(hasMeaningfulContent({ headline: "   " })).toBe(false);
  });

  it("neprazan string jeste sadržaj", () => {
    expect(hasMeaningfulContent({ headline: "Nega po meri" })).toBe(true);
  });

  it("neprazan niz jeste sadržaj", () => {
    expect(hasMeaningfulContent(untouchedAudiencePaths)).toBe(false);
    expect(hasMeaningfulContent(authoredAudiencePaths)).toBe(true);
  });

  it("ugnežđen objekat sa sadržajem se detektuje", () => {
    expect(
      hasMeaningfulContent({
        enabled: false,
        calendar: { label: "", month: "", slots: [] },
      }),
    ).toBe(false);
    expect(
      hasMeaningfulContent({
        enabled: false,
        calendar: { label: "", month: "Septembar", slots: [] },
      }),
    ).toBe(true);
  });

  it("`_id` i `__v` se ne broje kao sadržaj", () => {
    expect(hasMeaningfulContent({ _id: "abc", __v: 0, enabled: false })).toBe(
      false,
    );
  });

  it("niz objekata koji nose samo `_id` nije sadržaj", () => {
    expect(hasMeaningfulContent({ paths: [{ _id: "x" }, { _id: "y" }] })).toBe(
      false,
    );
  });

  describe("namerno greši u smeru „ima sadržaja”", () => {
    it("`true` duboko unutra se broji, `false` ne", () => {
      expect(hasMeaningfulContent({ calendar: { slots: [{ sel: false }] } })).toBe(
        false,
      );
      expect(hasMeaningfulContent({ calendar: { slots: [{ sel: true }] } })).toBe(
        true,
      );
    });

    it("broj se broji kao sadržaj, i nula", () => {
      expect(hasMeaningfulContent({ order: 0 })).toBe(true);
    });
  });
});

describe("classifySection — četiri pravila", () => {
  it("false + nema sadržaja → unset_candidate", () => {
    const r = classifySection("audiencePaths", untouchedAudiencePaths);
    expect(r.decision).toBe("unset_candidate");
    expect(r.enabled).toBe(false);
    expect(r.meaningfulContent).toBe(false);
  });

  it("false + ima sadržaja → review_has_content, NE DIRA SE", () => {
    const r = classifySection("audiencePaths", authoredAudiencePaths);
    expect(r.decision).toBe("review_has_content");
    expect(r.meaningfulContent).toBe(true);
  });

  it("true → keep_enabled, bez obzira na sadržaj", () => {
    expect(classifySection("topicHub", { enabled: true }).decision).toBe(
      "keep_enabled",
    );
    expect(
      classifySection("topicHub", { enabled: true, headline: "Teme" }).decision,
    ).toBe("keep_enabled");
  });

  it("enabled odsutno → already_absent", () => {
    const r = classifySection("credentials", { headline: "Reference" });
    expect(r.decision).toBe("already_absent");
    expect(r.enabled).toBeUndefined();
  });

  it("sekcije nema u dokumentu → section_missing", () => {
    expect(classifySection("finalCta", undefined).decision).toBe(
      "section_missing",
    );
    expect(classifySection("finalCta", null).decision).toBe("section_missing");
  });

  it("`enabled` koji nije boolean se tretira kao odsutan", () => {
    const r = classifySection("finalCta", { enabled: "false" });
    expect(r.enabled).toBeUndefined();
    expect(r.decision).toBe("already_absent");
  });
});

describe("classifyProfile", () => {
  it("pokriva svih sedam sekcija čak i kad ih dokument nema", () => {
    const r = classifyProfile({});
    expect(r.sections).toHaveLength(THEME9_TRISTATE_SECTIONS.length);
    expect(r.sections.every((s) => s.decision === "section_missing")).toBe(true);
    expect(r.unsetPaths).toEqual([]);
  });

  it("gradi tačne `$unset` putanje samo za kandidate", () => {
    const r = classifyProfile({
      landingTheme: "theme-9",
      landingStructure: {
        landing: {
          audiencePaths: untouchedAudiencePaths, // kandidat
          topicHub: { enabled: false, filters: [], topics: [] }, // kandidat
          credentials: authoredAudiencePaths, // ima sadržaj → ne dira
          finalCta: { enabled: true }, // uključeno → ne dira
        },
      },
    });

    expect(r.theme).toBe("theme-9");
    expect(r.unsetPaths).toEqual([
      "landingStructure.landing.audiencePaths.enabled",
      "landingStructure.landing.topicHub.enabled",
    ]);
  });

  it("profil koji nije theme-9 se svejedno skenira", () => {
    // `default: false` je materijalizovao `enabled` na svakom dokumentu
    // sačuvanom dok je default postojao, bez obzira na temu.
    const r = classifyProfile({
      landingTheme: "theme-3",
      landingStructure: { landing: { finalCta: { enabled: false } } },
    });
    expect(r.theme).toBe("theme-3");
    expect(r.unsetPaths).toEqual(["landingStructure.landing.finalCta.enabled"]);
  });
});

describe("idempotencija", () => {
  /** Primeni `$unset` putanje na dokument, kao što bi Mongo uradio. */
  function applyUnset(
    doc: Record<string, unknown>,
    paths: string[],
  ): Record<string, unknown> {
    const next = structuredClone(doc);
    for (const path of paths) {
      const keys = path.split(".");
      let cursor: Record<string, unknown> = next;
      for (const key of keys.slice(0, -1)) {
        cursor = cursor[key] as Record<string, unknown>;
      }
      delete cursor[keys[keys.length - 1]];
    }
    return next;
  }

  it("drugo pokretanje ne nalazi nijednog kandidata", () => {
    const doc = {
      landingTheme: "theme-9",
      landingStructure: {
        landing: {
          audiencePaths: { enabled: false, paths: [] },
          topicHub: { enabled: false, filters: [], topics: [] },
          credentials: { enabled: false, headline: "Reference" },
          finalCta: { enabled: true },
        },
      },
    };

    const first = classifyProfile(doc);
    expect(first.unsetPaths).toHaveLength(2);

    const afterApply = applyUnset(doc, first.unsetPaths);
    const second = classifyProfile(afterApply);

    expect(second.unsetPaths).toEqual([]);
  });

  it("posle primene te sekcije prelaze u already_absent, ostale se ne menjaju", () => {
    const doc = {
      landingStructure: {
        landing: {
          audiencePaths: { enabled: false, paths: [] },
          credentials: { enabled: false, headline: "Reference" },
          finalCta: { enabled: true },
        },
      },
    };

    const after = classifyProfile(applyUnset(doc, classifyProfile(doc).unsetPaths));
    const byName = Object.fromEntries(
      after.sections.map((s) => [s.section, s.decision]),
    );

    expect(byName.audiencePaths).toBe("already_absent");
    expect(byName.credentials).toBe("review_has_content");
    expect(byName.finalCta).toBe("keep_enabled");
  });
});
