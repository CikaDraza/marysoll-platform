import { readFileSync } from "node:fs";
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

describe("brisanje vlasničkog naloga", () => {
  it("briše i salon i AuthUser — nikad samo nalog", () => {
    const s = source(OWNER_DELETE);
    // Tenant mora nestati…
    expect(s).toMatch(/Tenant\.findByIdAndDelete/);
    // …i platformski identitet zajedno sa njim.
    expect(s).toMatch(/AuthUser\.findByIdAndDelete/);
  });

  it("dozvoljena je samo OWNER-u", () => {
    expect(source(OWNER_DELETE)).toContain('globalRole !== "OWNER"');
  });

  it("uklanja i članstvo u salonu", () => {
    expect(source(OWNER_DELETE)).toMatch(/TenantUser\.deleteMany/);
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
