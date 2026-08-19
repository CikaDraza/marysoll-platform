/**
 * Granica shell ugovora — regresija.
 *
 * `ThemeShellProps` je do neutralizacije nosio `salon: SalonProfileData` i
 * `services: IService[]`: ceo domenski objekat i booking katalog, svakoj temi,
 * bez obzira na to šta joj treba. `ThemeLandingProps` je tu granicu prešao u
 * T2A (korak 6); shell je ostao dug koji je education-first tema razotkrila —
 * theme-9 nema nijednu `Service` ako tenant prodaje samo edukacije.
 *
 * Test čuva da se domenski tipovi ne vrate u ZAJEDNIČKI ugovor. Per-theme view
 * modeli (`theme-shell-native.ts`) smeju da ih nose — tamo je to vlasništvo
 * konkretne teme, ne obaveza svih.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildThemeShellNative, shellNeedsServices } from "@/lib/platform/theme-shell-native";
import type { SalonProfileData } from "@/types";

const CONTRACT = join(process.cwd(), "src/components/themes/shells/types.ts");

describe("ThemeShellProps ne poznaje domenske tipove", () => {
  const source = readFileSync(CONTRACT, "utf8");
  // Komentar sme da objasni šta je uklonjeno; kod ne sme da to uveze nazad.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it.each([
    ["SalonProfileData", "ceo salonski profil"],
    ["IService", "katalog usluga"],
    ["landingStructure", "CMS strukturu"],
  ])("ne pominje %s (%s)", (token) => {
    expect(code).not.toContain(token);
  });

  it("uvozi samo view model tip, ne domen", () => {
    const imports = code.match(/^import .*$/gm) ?? [];
    expect(imports.join("\n")).toContain("theme-shell-native");
    expect(imports.join("\n")).not.toContain('from "@/types"');
  });
});

describe("buildThemeShellNative", () => {
  const salon = {
    name: "Marina B. Stanisavljević",
    description: "Skincare edukacija",
    email: "a@b.rs",
    phone: "060",
    logo: "https://cdn/logo.png",
    social: { instagram: "https://ig/marina" },
  } as unknown as SalonProfileData;

  it("teme bez shell potreba dobijaju prazan model", () => {
    for (const theme of ["theme-1", "theme-2", "theme-3"]) {
      expect(buildThemeShellNative(theme, { salon, services: [] })).toEqual({});
    }
  });

  it("daje SAMO model svoje teme", () => {
    const native = buildThemeShellNative("theme-9", { salon, services: [] });
    expect(Object.keys(native)).toEqual(["theme-9"]);
    expect(native["theme-9"]?.header.salonName).toBe("Marina B. Stanisavljević");
    expect(native["theme-9"]?.footer.tagline).toBe("Skincare edukacija");
  });

  it("samo theme-8 traži katalog usluga", () => {
    for (const theme of [
      "theme-1", "theme-2", "theme-3", "theme-4",
      "theme-5", "theme-6", "theme-7", "theme-9",
    ]) {
      expect(shellNeedsServices(theme), theme).toBe(false);
    }
    expect(shellNeedsServices("theme-8")).toBe(true);
  });

  it("theme-8 booking payload nosi usluge, ostale teme ih ne vide", () => {
    const services = [{ _id: "s1" }] as never[];
    const eight = buildThemeShellNative("theme-8", { salon, services });
    expect(eight["theme-8"]?.booking.services).toHaveLength(1);

    const seven = buildThemeShellNative("theme-7", { salon, services });
    expect(JSON.stringify(seven)).not.toContain("s1");
  });

  it("theme-5 uzima logo samo kad je apsolutni URL", () => {
    expect(
      buildThemeShellNative("theme-5", { salon, services: [] })["theme-5"]?.logoUrl,
    ).toBe("https://cdn/logo.png");

    const relative = { ...salon, logo: "/uploads/logo.png" } as SalonProfileData;
    expect(
      buildThemeShellNative("theme-5", { salon: relative, services: [] })["theme-5"]
        ?.logoUrl,
    ).toBeUndefined();
  });
});
