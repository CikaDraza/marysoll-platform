/**
 * 2C — content-aware navigation resolver.
 *
 * Najvažniji testovi ovde su dva: da nijedna stavka ne izađe bez dostupnog
 * odredišta, i da se `/edukacija` ne pojavi dok ruta ne postoji u kodu.
 */
import { describe, expect, it } from "vitest";
import {
  EDUCATION_ROUTE_AVAILABLE,
  NO_EDUCATION_SURFACE,
  THEME9_PAGE_KEYS,
  findNavItem,
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

  it("obe strane + objave — pun nav, u redosledu teme", () => {
    const nav = resolveTheme9Nav(
      facts({
        pages: { "za-klijente": true, "za-profesionalce": true },
        education: education({ hasPublishedArticles: true }),
      }),
    );
    expect(nav).toEqual([
      { key: "home", href: "/" },
      { key: "za-klijente", href: "/za-klijente" },
      { key: "za-profesionalce", href: "/za-profesionalce" },
      { key: "education", href: "/blogs" },
    ]);
  });

  it("path-based rutiranje prefiksuje SVAKI href", () => {
    const nav = resolveTheme9Nav(
      facts({
        base: "/marina",
        pages: { "za-klijente": true, "za-profesionalce": true },
        education: education({ hasPublishedArticles: true }),
      }),
    );
    for (const item of nav) expect(item.href.startsWith("/marina/")).toBe(true);
  });
});

describe("resolveEducationHref — tri ishoda iz ugovora", () => {
  it("ruta spremna + capability razrešen → /edukacija", () => {
    expect(
      resolveEducationHref(
        education({ routeAvailable: true, capabilityEnabled: true }),
        "",
      ),
    ).toBe("/edukacija");
  });

  it("bez Education Center-a, ali sa objavama → /blogs", () => {
    expect(
      resolveEducationHref(education({ hasPublishedArticles: true }), ""),
    ).toBe("/blogs");
  });

  it("ni jedno ni drugo → link se ne prikazuje", () => {
    expect(resolveEducationHref(education(), "")).toBeNull();
  });

  it("capability BEZ rute ne sme da proizvede /edukacija — to je 404", () => {
    expect(
      resolveEducationHref(
        education({ routeAvailable: false, capabilityEnabled: true }),
        "",
      ),
    ).toBeNull();
  });

  it("ruta BEZ capability-ja ne sme da proizvede /edukacija", () => {
    expect(
      resolveEducationHref(
        education({ routeAvailable: true, capabilityEnabled: false }),
        "",
      ),
    ).toBeNull();
  });

  it("Education Center ima prednost nad postojećim blog sadržajem", () => {
    expect(
      resolveEducationHref(
        education({
          routeAvailable: true,
          capabilityEnabled: true,
          hasPublishedArticles: true,
        }),
        "",
      ),
    ).toBe("/edukacija");
  });

  it("kad Education Center otpadne, blog sadržaj je i dalje legitiman izlaz", () => {
    expect(
      resolveEducationHref(
        education({ capabilityEnabled: true, hasPublishedArticles: true }),
        "/marina",
      ),
    ).toBe("/marina/blogs");
  });
});

describe("granica prema Education Center-u", () => {
  it("ruta /edukacija još ne postoji u kodu", () => {
    // Ovaj test pada NAMERNO kada neko postavi zastavicu na `true`: tada mora
    // da postoji i `src/app/tenant/edukacija/`, pa se test menja zajedno sa njom.
    expect(EDUCATION_ROUTE_AVAILABLE).toBe(false);
  });

  it("fail-closed polazište ne prikazuje Edukaciju", () => {
    expect(resolveEducationHref(NO_EDUCATION_SURFACE, "")).toBeNull();
  });

  it("dok je zastavica `false`, nijedna kombinacija ne daje /edukacija", () => {
    for (const capabilityEnabled of [false, true]) {
      for (const hasPublishedArticles of [false, true]) {
        const href = resolveEducationHref(
          {
            routeAvailable: EDUCATION_ROUTE_AVAILABLE,
            capabilityEnabled,
            hasPublishedArticles,
          },
          "",
        );
        expect(href, `${capabilityEnabled}/${hasPublishedArticles}`).not.toBe(
          "/edukacija",
        );
      }
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
