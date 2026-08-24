import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Lifecycle invariant: salon NIKADA ne postoji bez vlasnika, a vlasnik nikada
 * ne briše samo svoj nalog dok poseduje salon.
 *
 * Ovi guardovi čitaju izvor jer prava provera traži bazu; cilj je da se
 * semantika ne izgubi tihom izmenom rute. Podatkovnu stranu pokrivaju
 * `tenant.ownership.*` provere u diagnostic engine-u.
 */
function source(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), "utf8");
}

const OWNER_DELETE = "src/app/api/tenant-auth/delete-account/route.ts";
const LOGIN = "src/app/api/auth/login/route.ts";

describe("brisanje salona", () => {
  it("ide kroz canonical servis, ne kroz sopstvenu cascade listu", () => {
    const s = source(OWNER_DELETE);
    expect(s).toContain("deleteTenantPermanently");
    expect(s).not.toMatch(/\w+\.deleteMany\(/);
  });

  it("dozvoljena je samo OWNER-u", () => {
    const s = source(OWNER_DELETE);
    expect(s).toContain('globalRole !== "OWNER"');
    // Uloga se potvrđuje i iz baze, ne samo iz JWT claim-a.
    expect(s).toMatch(/caller\.role !== "OWNER"/);
  });

  it("servis briše salon, identitete i zaustavlja naplatu", () => {
    const service = source("src/lib/tenant/deleteTenant.ts");
    expect(service).toMatch(/Tenant\.findByIdAndDelete/);
    expect(service).toMatch(/AuthUser\.findByIdAndDelete/);
    expect(service).toContain("cancelPaddleSubscription");
  });

  it("naplata je gate PRE brisanja — neuspeh znači nula delete-a", () => {
    const service = source("src/lib/tenant/deleteTenant.ts");
    const billingAt = service.indexOf("stopFutureBilling(tenantId)");
    const cascadeAt = service.indexOf("deleteTenantBookingData(tenantId)");
    expect(billingAt).toBeGreaterThan(0);
    expect(cascadeAt).toBeGreaterThan(billingAt);
    expect(service).toContain("TENANT_BILLING_CANCELLATION_FAILED");
  });

  it("ownership mismatch pada pre bilo kakvog brisanja", () => {
    const service = source("src/lib/tenant/deleteTenant.ts");
    const integrityAt = service.indexOf("TENANT_OWNERSHIP_INTEGRITY_ERROR");
    const cascadeAt = service.indexOf("deleteTenantBookingData(tenantId)");
    expect(integrityAt).toBeGreaterThan(0);
    expect(cascadeAt).toBeGreaterThan(integrityAt);
  });

  it("SUPER_ADMIN nikada nije pogođen brisanjem salona", () => {
    expect(source("src/lib/tenant/deleteTenant.ts")).toContain('"SUPER_ADMIN"');
  });
});

describe("ProfilTab ima tačno jednu destruktivnu owner akciju", () => {
  const PROFIL_TAB = "src/components/admin/dashboard/ProfilTab.tsx";

  it("nema više profile-only brisanja", () => {
    expect(source(PROFIL_TAB)).not.toContain("deleteProfile");
  });

  it("akcija je vidljiva samo OWNER-u", () => {
    const s = source(PROFIL_TAB);
    expect(s).toContain('user?.globalRole === "OWNER"');
  });

  it("potvrda ide preko naziva salona, ne emaila", () => {
    const s = source(PROFIL_TAB);
    expect(s).toContain("Upišite naziv salona");
    expect(s).toMatch(/deleteSalonInput\.trim\(\) !== \(sp\.profile\?\.name/);
  });

  it("profile-only endpoint više ne postoji", () => {
    expect(
      existsSync(path.join(process.cwd(), "src/app/api/salon-profile/delete")),
    ).toBe(false);
  });
});

describe("prijava ne pravi izuzetak za nalog bez salona", () => {
  it("nema samoisceljenja vlasništva ni kreiranja salona iz login-a", () => {
    const s = source(LOGIN);
    // Povezivanje starog salona sa nalogom po emailu je integrity incident,
    // ne korisnički tok — superadmin to radi eksplicitno.
    expect(s).not.toMatch(/TenantUser\.create/);
    expect(s).not.toMatch(/OWNER_TENANTUSER_RESTORED/);
  });

  it("nalog bez upravljačkog članstva dobija 403", () => {
    expect(source(LOGIN)).toContain("Pristup nije dozvoljen.");
  });
});
