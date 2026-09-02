import { describe, expect, it } from "vitest";
import { themePickerThemesForTenant } from "./shared";

function idsFor(tenantSlug: string) {
  return themePickerThemesForTenant(tenantSlug).map(({ id }) => id);
}

describe("theme picker access projection", () => {
  it("does not show private themes to an ordinary tenant", () => {
    const themes = idsFor("ordinary-beauty-studio");

    expect(themes).not.toContain("theme-8");
    expect(themes).not.toContain("theme-9");
    // theme-1 je od 2026-09-02 privatna za Marysoll.
    expect(themes).not.toContain("theme-1");
    expect(themes).toHaveLength(6);
  });

  it("shows Theme 1 only to Marysoll", () => {
    expect(idsFor("marysoll-makeup-nails")).toContain("theme-1");
    expect(idsFor("ordinary-beauty-studio")).not.toContain("theme-1");
  });

  it("shows Theme 8 only to The Lash Room", () => {
    const themes = idsFor("the-lash-room-by-anja");

    expect(themes).toContain("theme-8");
    expect(themes).not.toContain("theme-9");
  });

  it("shows Theme 9 only to Marina", () => {
    const themes = idsFor("marina-stanisavljevic-skincare-edukacija");

    expect(themes).toContain("theme-9");
    expect(themes).not.toContain("theme-8");
  });
});
