/**
 * 2C — navigacija theme-9 kroz view modele.
 *
 * Dva najvažnija testa: (1) nav i ruta odlučuju po istom pravilu, pa nijedna
 * stavka ne može da vodi u 404; (2) početna strana i podstranica dobijaju
 * IDENTIČAN meni — inače bi ista tema imala dva različita header-a.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SalonProfileData, TenantThemePage } from "@/types";
import { buildThemeNative, buildTheme9Nav } from "./theme-native";
import { buildThemeShellNative } from "./theme-shell-native";
import { resolveThemePage } from "./theme-pages";
import type { Theme9EducationFacts } from "@/lib/theme9/navigationResolver";

const page: TenantThemePage = {
  enabled: true,
  hero: { headline: "Razumevanje sopstvene kože" },
};

function salonOf(over: Partial<SalonProfileData> = {}): SalonProfileData {
  return {
    name: "Marina B. Stanisavljević",
    description: "Skincare edukacija",
    email: "a@b.rs",
    phone: "060",
    social: {},
    landingTheme: "theme-9",
    ...over,
  } as unknown as SalonProfileData;
}

function education(over: Partial<Theme9EducationFacts> = {}): Theme9EducationFacts {
  return {
    routeAvailable: true,
    capabilityEnabled: false,
    hasPublishedArticles: false,
    hasPublishedEducation: false,
    ...over,
  };
}

describe("buildTheme9Nav — isto pravilo kao ruta", () => {
  it("tenant bez `themePages` nema te stavke — ruta bi mu vratila 404", () => {
    const salon = salonOf();

    // Dokaz da je reč o istom pravilu, a ne o dve slične provere.
    expect(resolveThemePage(salon, "za-klijente")).toBeNull();
    expect(buildTheme9Nav(salon, undefined).map((i) => i.key)).toEqual(["home"]);
  });

  it("tenant sa seed-ovanim stranama dobija obe stavke", () => {
    const salon = salonOf({
      themePages: { "za-klijente": page, "za-profesionalce": page },
    });
    expect(buildTheme9Nav(salon, undefined)).toEqual([
      { key: "home", href: "/" },
      { key: "za-klijente", href: "/za-klijente" },
      { key: "za-profesionalce", href: "/za-profesionalce" },
    ]);
  });

  it("strana isključena u sadržaju ne ulazi u nav", () => {
    const salon = salonOf({
      themePages: {
        "za-klijente": { ...page, enabled: false },
        "za-profesionalce": page,
      },
    });
    expect(buildTheme9Nav(salon, undefined).map((i) => i.key)).toEqual([
      "home",
      "za-profesionalce",
    ]);
  });

  it("path-based rutiranje prefiksuje sve stavke", () => {
    const salon = salonOf({ themePages: { "za-klijente": page } });
    expect(buildTheme9Nav(salon, "marina").map((i) => i.href)).toEqual([
      "/marina/",
      "/marina/za-klijente",
    ]);
  });
});

describe("Blog i Edukacija prate svoj sadržaj, nezavisno", () => {
  const salon = salonOf();

  it("bez ijednog kanala se ne prikazuje nijedna stavka", () => {
    expect(buildTheme9Nav(salon, undefined, education()).map((i) => i.key)).toEqual([
      "home",
    ]);
  });

  it("blog objave daju Blog link", () => {
    const nav = buildTheme9Nav(
      salon,
      undefined,
      education({ hasPublishedArticles: true }),
    );
    expect(nav.at(-1)).toEqual({ key: "blog", href: "/blogs" });
  });

  it("razrešen Edu Centar sa objavljenim sadržajem daje Edukacija link", () => {
    const nav = buildTheme9Nav(
      salon,
      undefined,
      education({ capabilityEnabled: true, hasPublishedEducation: true }),
    );
    expect(nav.at(-1)).toEqual({ key: "education", href: "/edukacija" });
  });

  it("tenant sa oba kanala dobija oba linka", () => {
    const nav = buildTheme9Nav(
      salon,
      undefined,
      education({
        capabilityEnabled: true,
        hasPublishedArticles: true,
        hasPublishedEducation: true,
      }),
    );
    expect(nav.map((i) => i.key)).toEqual(["home", "blog", "education"]);
  });

  it("bez prosleđenih činjenica pada fail-closed", () => {
    const keys = buildTheme9Nav(salon, undefined).map((i) => i.key);
    expect(keys).not.toContain("education");
    expect(keys).not.toContain("blog");
  });
});

describe("početna i podstranica ne smeju imati različit meni", () => {
  const salon = salonOf({
    themePages: { "za-klijente": page, "za-profesionalce": page },
  });
  const educationSurface = education({ hasPublishedArticles: true });

  it("landing view model i shell view model daju isti nav", () => {
    const landing = buildThemeNative("theme-9", {
      salon,
      services: [],
      testimonials: [],
      tenantSlug: "marina",
      educationSurface,
    });
    const shell = buildThemeShellNative("theme-9", {
      salon,
      services: [],
      tenantSlug: "marina",
      educationSurface,
    });

    expect(landing["theme-9"]?.nav).toEqual(shell["theme-9"]?.nav);
    expect(landing["theme-9"]?.nav.map((i) => i.href)).toEqual([
      "/marina/",
      "/marina/za-klijente",
      "/marina/za-profesionalce",
      "/marina/blogs",
    ]);
  });
});

describe("Header i Footer ne smeju da vrate hardkodovane linkove", () => {
  const files = ["Header.tsx", "Footer.tsx"];

  it.each(files)("%s ne gradi rute podstranica sam", (file) => {
    const source = readFileSync(
      join(process.cwd(), "src/components/themes/theme-9", file),
      "utf8",
    );
    // Komentar sme da objasni koje rute postoje; kod ne sme da ih gradi.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    for (const route of ["za-klijente", "za-profesionalce", "blogs", "edukacija"]) {
      expect(code, route).not.toContain(`/${route}`);
    }
  });
});
