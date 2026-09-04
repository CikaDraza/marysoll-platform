/**
 * Zahtev klijentkinje („intake") nosi KATEGORIJA, ne usluga.
 *
 * Testira se pravilo koje odlučuje da li BookingWidget nudi korak sa slikom:
 * kategorija noktiju ga traži kroz SVE podkategorije, šminka ne.
 */
import { describe, it, expect } from "vitest";
import { CATEGORY_MAP } from "./categoryMap";

describe("CATEGORY_MAP — requiresIntake", () => {
  it("nokti traže zahtev", () => {
    expect(CATEGORY_MAP.nails.requiresIntake).toBe(true);
  });

  it("šminka ne traži zahtev", () => {
    expect(CATEGORY_MAP.makeup?.requiresIntake ?? false).toBe(false);
  });

  it("sve podkategorije noktiju dele isti ključ kategorije", () => {
    // Usluga nosi `categorySlug: "nails"` bez obzira na podkategoriju, pa
    // pravilo po kategoriji automatski pokriva izlivanje, korekciju i manikir.
    expect(Object.keys(CATEGORY_MAP.nails.subcategories).length).toBeGreaterThan(0);
  });

  it("ostale kategorije podrazumevano ne traže zahtev", () => {
    const withIntake = Object.entries(CATEGORY_MAP)
      .filter(([, c]) => c.requiresIntake)
      .map(([key]) => key);
    expect(withIntake).toEqual(["nails"]);
  });
});
