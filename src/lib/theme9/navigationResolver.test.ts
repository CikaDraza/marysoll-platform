/**
 * 2C — content-aware navigation resolver.
 *
 * Najvažniji testovi ovde su dva: da nijedna stavka ne izađe bez dostupnog
 * odredišta, i da su Blog i Edukacija dva NEZAVISNA linka — tenant sme dobiti
 * jedan, oba ili nijedan, i uključivanje Edu Centra ne sme mu oduzeti blog.
 */
import { describe, expect, it } from "vitest";
import {
  EDUCATION_ROUTE_AVAILABLE,
  NO_EDUCATION_SURFACE,
  THEME9_PAGE_KEYS,
  findNavItem,
  resolveBlogHref,
  resolveEducationHref,
  resolveTheme9Nav,
  type Theme9EducationFacts,
  type Theme9NavFacts,
} from "./navigationResolver";

function facts(over: Partial<Theme9NavFacts> = {}): Theme9NavFacts {
  return {
    base: "",
    pages: { "za-klijente": false, "za-profesionalce": false },
    education: NO_EDUCATION_SURFACE,
    ...over,
  };
}

function education(over: Partial<Theme9EducationFacts> = {}): Theme9EducationFacts {
  return { ...NO_EDUCATION_SURFACE, ...over };
}

describe("resolveTheme9Nav — stavka postoji samo ako odredište ima sadržaj", () => {
  it("tenant bez ijedne podstranice i bez objava — ostaje samo Početna", () => {
    expect(resolveTheme9Nav(facts())).toEqual([{ key: "home", href: "/" }]);
  });

  it("Početna je bezuslovna — nju tema uvek renderuje", () => {
    const nav = resolveTheme9Nav(facts({ base: "/marina" }));
    expect(nav[0]).toEqual({ key: "home", href: "/marina/" });
  });

  it("strana koja postoji ulazi u nav; ona koja ne postoji ne ulazi", () => {
    const nav = resolveTheme9Nav(
      facts({ pages: { "za-klijente": true, "za-profesionalce": false } }),
    );
    expect(nav.map((i) => i.key)).toEqual(["home", "za-klijente"]);
  });

  it("obe strane + oba kanala — pun nav, u redosledu teme", () => {
    const nav = resolveTheme9Nav(
      facts({
        pages: { "za-klijente": true, "za-profesionalce": true },
        education: education({
          capabilityEnabled: true,
          hasPublishedArticles: true,
          hasPublishedEducation: true,
        }),
      }),
    );
    expect(nav).toEqual([
      { key: "home", href: "/" },
      { key: "za-klijente", href: "/za-klijente" },
      { key: "za-profesionalce", href: "/za-profesionalce" },
      { key: "blog", href: "/blogs" },
      { key: "education", href: "/edukacija" },
    ]);
  });

  it("path-based rutiranje prefiksuje SVAKI href", () => {
    const nav = resolveTheme9Nav(
      facts({
        base: "/marina",
        pages: { "za-klijente": true, "za-profesionalce": true },
        education: education({
          capabilityEnabled: true,
          hasPublishedArticles: true,
          hasPublishedEducation: true,
        }),
      }),
    );
    for (const item of nav) expect(item.href.startsWith("/marina/")).toBe(true);
  });
});

describe("Blog i Edukacija su nezavisni linkovi", () => {
  const bothChannels = education({
    capabilityEnabled: true,
    hasPublishedArticles: true,
    hasPublishedEducation: true,
  });

  it("samo Blog: tenant bez Edu Centra zadržava svoj blog", () => {
    const nav = resolveTheme9Nav(
      facts({ education: education({ hasPublishedArticles: true }) }),
    );
    expect(nav.map((i) => i.key)).toEqual(["home", "blog"]);
  });

  it("samo Edukacija: Edu tenant bez blog objava", () => {
    const nav = resolveTheme9Nav(
      facts({
        education: education({
          capabilityEnabled: true,
          hasPublishedEducation: true,
        }),
      }),
    );
    expect(nav.map((i) => i.key)).toEqual(["home", "education"]);
  });

  it("oba kanala: obe stavke, Blog pa Edukacija", () => {
    const nav = resolveTheme9Nav(facts({ education: bothChannels }));
    expect(nav).toEqual([
      { key: "home", href: "/" },
      { key: "blog", href: "/blogs" },
      { key: "education", href: "/edukacija" },
    ]);
  });

  it("nijedan kanal: nijedna stavka", () => {
    expect(resolveTheme9Nav(facts()).map((i) => i.key)).toEqual(["home"]);
  });

  it("uključivanje Edu Centra NE oduzima Blog link", () => {
    const beforeActivation = resolveTheme9Nav(
      facts({ education: education({ hasPublishedArticles: true }) }),
    );
    const afterActivation = resolveTheme9Nav(facts({ education: bothChannels }));

    expect(findNavItem(beforeActivation, "blog")?.href).toBe("/blogs");
    expect(findNavItem(afterActivation, "blog")?.href).toBe("/blogs");
  });

  it("Edukacija više NIKADA ne pada na /blogs", () => {
    // Prevaziđeni fallback: bez razrešenog Edu sadržaja stavke jednostavno nema.
    for (const capabilityEnabled of [false, true]) {
      expect(
        resolveEducationHref(
          education({ capabilityEnabled, hasPublishedArticles: true }),
          "",
        ),
      ).toBeNull();
    }
  });

  it("Blog ne zna ništa o Education capability-ju", () => {
    expect(
      resolveBlogHref(education({ hasPublishedArticles: true }), "/marina"),
    ).toBe("/marina/blogs");
    expect(resolveBlogHref(bothChannels, "")).toBe("/blogs");
    expect(resolveBlogHref(education({ capabilityEnabled: true }), "")).toBeNull();
  });
});

describe("granica prema Education Center-u", () => {
  it("ruta /edukacija postoji u kodu", () => {
    expect(EDUCATION_ROUTE_AVAILABLE).toBe(true);
  });

  it("fail-closed polazište ne prikazuje nijedan kanal", () => {
    expect(resolveEducationHref(NO_EDUCATION_SURFACE, "")).toBeNull();
    expect(resolveBlogHref(NO_EDUCATION_SURFACE, "")).toBeNull();
  });

  it("nijedan pojedinačan uslov nije dovoljan za /edukacija", () => {
    const combos: Partial<Theme9EducationFacts>[] = [
      { capabilityEnabled: true },
      { hasPublishedEducation: true },
      { routeAvailable: false, capabilityEnabled: true, hasPublishedEducation: true },
    ];

    for (const combo of combos) {
      expect(resolveEducationHref(education(combo), "")).toBeNull();
    }
  });
});

describe("findNavItem", () => {
  it("vraća stavku po ključu, ili undefined kad je resolver nije pustio", () => {
    const nav = resolveTheme9Nav(
      facts({ pages: { "za-klijente": true, "za-profesionalce": false } }),
    );
    expect(findNavItem(nav, "za-klijente")?.href).toBe("/za-klijente");
    expect(findNavItem(nav, "za-profesionalce")).toBeUndefined();
    expect(findNavItem(nav, "education")).toBeUndefined();
  });
});

describe("ključevi podstranica", () => {
  it("poklapaju se sa rutama koje stvarno postoje u src/app/tenant", () => {
    expect([...THEME9_PAGE_KEYS]).toEqual(["za-klijente", "za-profesionalce"]);
  });
});
