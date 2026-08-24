import { describe, expect, it } from "vitest";
import { PLATFORM_PATH_SEGMENTS, tenantSlugFromPath } from "@/lib/platform/host-context";
import { RESERVED_TOP_SEGMENTS } from "@/lib/proxy/constants";
import { loginRedirectUrl } from "@/lib/auth/loginRedirect";

/**
 * Vlasnica bez salona: nalog živi, salon je obrisan.
 *
 * Salon i nalog su NAMERNO odvojeni — vlasnica sme da obriše salon a zadrži
 * nalog da bi napravila drugi. Do popravke je takav nalog dobijao 403 na
 * `/api/auth/login` i bio potpuno zaključan.
 */
describe("ruta /novi-salon", () => {
  it("nije tenant slug — inače bi je proxy tražio kao salon", () => {
    expect(PLATFORM_PATH_SEGMENTS.has("novi-salon")).toBe(true);
    expect(RESERVED_TOP_SEGMENTS.has("novi-salon")).toBe(true);
    expect(tenantSlugFromPath("/novi-salon")).toBeNull();
  });

  it("običan slug se i dalje razrešava kao salon", () => {
    expect(tenantSlugFromPath("/lash-room-by-anja")).toBe("lash-room-by-anja");
  });
});

describe("preusmerenje posle prijave", () => {
  const base = { token: "t", hostname: "marysoll.com" };

  it("vlasnica bez salona ide na /novi-salon, ne na /dashboard", () => {
    // `/dashboard` guard traži `isAdmin` — bez salona bi je vrtelo na /login.
    const url = loginRedirectUrl({
      ...base,
      isAdmin: false,
      isSuperAdmin: false,
      hasNoSalon: true,
    });
    expect(url).toContain("/novi-salon");
  });

  it("vlasnica SA salonom i dalje ide na dashboard", () => {
    const url = loginRedirectUrl({
      ...base,
      isAdmin: true,
      isSuperAdmin: false,
      hasNoSalon: false,
    });
    expect(url).toContain("/dashboard");
  });

  it("superadmin nije pogođen — i on nema tenanta", () => {
    const url = loginRedirectUrl({
      ...base,
      isAdmin: true,
      isSuperAdmin: true,
    });
    expect(url).toContain("/superadmin");
  });

  it("na path-based hostu preusmerenje ostaje relativno", () => {
    const url = loginRedirectUrl({
      token: "t",
      hostname: "staging.marysoll.com",
      isAdmin: false,
      isSuperAdmin: false,
      hasNoSalon: true,
    });
    expect(url).toBe("/novi-salon");
  });
});
