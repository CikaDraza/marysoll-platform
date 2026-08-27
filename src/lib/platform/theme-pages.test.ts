/**
 * Tematske podstranice — razrešavanje i granica prema seed-u.
 *
 * Najvažniji test ovde je poslednji: seed puni podatke JEDNOG tenanta i ne sme
 * da postane implicitni fallback teme. Drugi theme-9 tenant bez svog sadržaja
 * mora dobiti 404, nikad tuđi tekst.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SalonProfileData, TenantThemePage } from "@/types";
import {
  isThemePageAvailable,
  resolveThemePage,
  themeHasPages,
} from "./theme-pages";

function profile(over: Partial<SalonProfileData> = {}): SalonProfileData {
  return { name: "Salon", landingTheme: "theme-9", ...over } as SalonProfileData;
}

const page: TenantThemePage = {
  enabled: true,
  hero: { headline: "Razumevanje sopstvene kože" },
};

describe("themeHasPages", () => {
  it("samo theme-9 ima tematske podstranice", () => {
    expect(themeHasPages("theme-9")).toBe(true);
    for (const t of ["theme-1", "theme-3", "theme-8", "", undefined]) {
      expect(themeHasPages(t), String(t)).toBe(false);
    }
  });
});

describe("resolveThemePage", () => {
  it("theme-9 sa seedovanim sadržajem — renderuje podatke tenanta", () => {
    const resolved = resolveThemePage(
      profile({ themePages: { "za-klijente": page } }),
      "za-klijente",
    );
    expect(resolved?.hero?.headline).toBe("Razumevanje sopstvene kože");
  });

  it("theme-9 sa praznim themePages → 404", () => {
    expect(resolveThemePage(profile(), "za-klijente")).toBeNull();
    expect(resolveThemePage(profile({ themePages: {} }), "za-profesionalce")).toBeNull();
  });

  it("sadržaj postoji ali je isključen → 404", () => {
    const off = { ...page, enabled: false };
    expect(
      resolveThemePage(profile({ themePages: { "za-klijente": off } }), "za-klijente"),
    ).toBeNull();
  });

  it("druga tema sa istim sadržajem → 404 (strana ne postoji van theme-9)", () => {
    expect(
      resolveThemePage(
        profile({ landingTheme: "theme-3", themePages: { "za-klijente": page } }),
        "za-klijente",
      ),
    ).toBeNull();
  });

  it("nema profila → 404", () => {
    expect(resolveThemePage(null, "za-klijente")).toBeNull();
    expect(resolveThemePage(undefined, "za-profesionalce")).toBeNull();
  });

  it("traži se druga strana od one koju tenant ima → 404", () => {
    const only = profile({ themePages: { "za-klijente": page } });
    expect(resolveThemePage(only, "za-profesionalce")).toBeNull();
  });
});

describe("isThemePageAvailable — isto pravilo, kao da/ne", () => {
  it("prati `resolveThemePage` u svakom slučaju", () => {
    const cases: (SalonProfileData | null)[] = [
      profile({ themePages: { "za-klijente": page } }),
      profile({ themePages: { "za-klijente": { ...page, enabled: false } } }),
      profile({ landingTheme: "theme-3", themePages: { "za-klijente": page } }),
      profile(),
      null,
    ];

    for (const salon of cases) {
      expect(isThemePageAvailable(salon, "za-klijente")).toBe(
        resolveThemePage(salon, "za-klijente") !== null,
      );
    }
  });

  it("navigacija tako ne može da ponudi stranu koja vraća 404", () => {
    expect(isThemePageAvailable(profile(), "za-klijente")).toBe(false);
    expect(
      isThemePageAvailable(profile({ themePages: { "za-klijente": page } }), "za-klijente"),
    ).toBe(true);
  });
});

describe("seed nije fallback teme", () => {
  it("DRUGI theme-9 tenant bez svog sadržaja NIKAD ne vidi tuđe tekstove", () => {
    const drugiTenant = profile({ name: "Neki drugi education salon" });

    for (const key of ["za-klijente", "za-profesionalce"] as const) {
      expect(resolveThemePage(drugiTenant, key)).toBeNull();
    }
  });

  it("nijedan fajl u src/ ne uvozi seed podatke", () => {
    const offenders: string[] = [];

    function walk(dir: string) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        // Testovi su izuzeti — ovaj fajl i sam pominje te nazive.
        if (!/\.(ts|tsx|mts)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) continue;
        const src = readFileSync(full, "utf8");
        if (src.includes("scripts/seeds") || src.includes("expert-editorial-content")) {
          offenders.push(full);
        }
      }
    }
    walk(join(process.cwd(), "src"));

    expect(offenders).toEqual([]);
  });

  it("nijedan fajl u src/ ne uvozi dizajn handoff fixture", () => {
    const offenders: string[] = [];

    function walk(dir: string) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        // Testovi su izuzeti — ovaj fajl i sam pominje te nazive.
        if (!/\.(ts|tsx|mts)$/.test(entry) || /\.test\.(ts|tsx)$/.test(entry)) continue;
        const src = readFileSync(full, "utf8");
        // Komentar sme da uputi na handoff; import ne sme da ga povuče.
        const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
        if (code.includes("marina-fixture") || code.includes("Skincare_Platform_Design-handoff")) {
          offenders.push(full);
        }
      }
    }
    walk(join(process.cwd(), "src"));

    expect(offenders).toEqual([]);
  });
});
