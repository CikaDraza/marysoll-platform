import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { LandingStructure } from "@/types";
import { SalonProfile } from "@/models/SalonProfile";
import { createTheme9Starter } from "./starter";
import { resolveTheme9Section } from "./presentationResolver";

describe("public Theme 9 starter", () => {
  it("fills empty Mongoose defaults, including the about visibility flag", () => {
    const profile = new SalonProfile({ name: "Novi centar", email: "owner@example.test" }).toObject();
    const result = createTheme9Starter(profile.name, profile.landingStructure);
    expect(result.landingStructure.landing.about.image?.src).toBe("/images/theme-9/starter/learning.svg");
    expect(result.landingStructure.landing.hero.image?.src).toBe("/images/theme-9/starter/care.svg");
  });
  it("persists renderable content and local neutral images through the real schema", () => {
    const starter = createTheme9Starter("Novi Edu Centar");
    const document = new SalonProfile({
      tenantId: "507f1f77bcf86cd799439011",
      name: "Novi Edu Centar",
      email: "owner@example.test",
      landingTheme: "theme-9",
      theme9StarterVersion: 1,
      ...starter,
    });
    expect(document.validateSync()).toBeUndefined();
    const stored = document.toObject();
    expect(stored.theme9StarterVersion).toBe(1);
    expect(stored.landingStructure?.landing?.hero?.headline).toBe("Novi Edu Centar");
    for (const key of ["audiencePaths", "guidedCareProcess", "professionalPath", "finalCta"] as const) {
      expect(resolveTheme9Section(stored.landingStructure?.landing?.[key])).toBe("authored");
    }
    expect(stored.themePages["za-klijente"].enabled).toBe(true);
    for (const section of [starter.landingStructure.landing.hero, starter.landingStructure.landing.about]) {
      const path = join(process.cwd(), "public", section.image!.src);
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, "utf8")).toContain("<svg");
    }
    expect(JSON.stringify(starter)).not.toMatch(/marina|hero-portret|about-portret/i);
    expect(stored.themeBookingPreview).toBeUndefined();
  });

  it("preserves authored content, disabled sections, pages, and unrelated settings", () => {
    const current = {
      landing: {
        hero: { enabled: true, headline: "Moj naslov", image: { src: "/moj-portret.png" } },
        about: { enabled: false },
        audiencePaths: { enabled: false },
      },
      pages: { servicesPage: { headline: "Moje usluge" } },
    } as LandingStructure;
    const pages = { "za-klijente": { enabled: false }, "za-profesionalce": { enabled: true, hero: { headline: "Moja edukacija" } } };
    const original = structuredClone(current);
    const result = createTheme9Starter("Novi centar", current, pages);
    expect(result.landingStructure.landing.hero).toEqual(current.landing.hero);
    expect(result.landingStructure.landing.about).toEqual({ enabled: false });
    expect(result.landingStructure.landing.audiencePaths).toEqual({ enabled: false });
    expect(result.landingStructure.pages).toEqual(current.pages);
    expect(result.themePages).toEqual(pages);
    expect(current).toEqual(original);
  });
});
