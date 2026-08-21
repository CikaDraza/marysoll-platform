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
    expect(themes).toHaveLength(7);
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
