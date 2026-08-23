import { describe, expect, it } from "vitest";
import {
  availableThemesForTenant,
  canTenantUseTheme,
} from "./theme-access";

const LASH_ROOM = "the-lash-room-by-anja";
const MARINA = "marina-stanisavljevic-skincare-edukacija";

describe("Theme Access Policy", () => {
  it("keeps themes 1–7 available to every tenant", () => {
    for (const theme of [
      "theme-1",
      "theme-2",
      "theme-3",
      "theme-4",
      "theme-5",
      "theme-6",
      "theme-7",
    ] as const) {
      expect(
        canTenantUseTheme({ theme, tenantSlug: "ordinary-beauty-studio" }),
      ).toBe(true);
    }
  });

  it("allows Theme 8 only to The Lash Room", () => {
    expect(canTenantUseTheme({ theme: "theme-8", tenantSlug: LASH_ROOM })).toBe(
      true,
    );
    expect(
      canTenantUseTheme({ theme: "theme-8", tenantSlug: MARINA }),
    ).toBe(false);
    expect(
      canTenantUseTheme({ theme: "theme-8", tenantSlug: "ordinary-salon" }),
    ).toBe(false);
  });

  it("allows Theme 9 only to Marina", () => {
    expect(canTenantUseTheme({ theme: "theme-9", tenantSlug: MARINA })).toBe(
      true,
    );
    expect(
      canTenantUseTheme({ theme: "theme-9", tenantSlug: LASH_ROOM }),
    ).toBe(false);
    expect(
      canTenantUseTheme({ theme: "theme-9", tenantSlug: "ordinary-salon" }),
    ).toBe(false);
  });

  it("projects only the private theme each approved tenant may use", () => {
    expect(availableThemesForTenant("ordinary-salon")).toEqual([
      "theme-1",
      "theme-2",
      "theme-3",
      "theme-4",
      "theme-5",
      "theme-6",
      "theme-7",
    ]);
    expect(availableThemesForTenant(LASH_ROOM)).toContain("theme-8");
    expect(availableThemesForTenant(LASH_ROOM)).not.toContain("theme-9");
    expect(availableThemesForTenant(MARINA)).toContain("theme-9");
    expect(availableThemesForTenant(MARINA)).not.toContain("theme-8");
  });
});
