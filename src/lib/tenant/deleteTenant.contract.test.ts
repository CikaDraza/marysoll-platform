import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Spisak se čita iz IZVORA, ne importom: `deleteTenant.ts` povlači Paddle i
 * Mongo konekciju, koja pri učitavanju traži `MONGODB_URI`. Guard mora da radi
 * bez baze i bez env-a.
 */
const TENANT_SCOPED_CASCADE: string[] = (() => {
  const src = readFileSync(
    path.join(process.cwd(), "src/lib/tenant/deleteTenant.ts"),
    "utf8",
  );
  const block = src.slice(
    src.indexOf("function tenantScopedModels()"),
    src.indexOf("] as const;"),
  );
  return [...block.matchAll(/\["(\w+)",\s*\w+\]/g)].map((m) => m[1]);
})();

/**
 * Canonical cascade je ugovor: nova tenant-scoped kolekcija mora ući u
 * `deleteTenant.ts`, inače njeni podaci prežive brisanje salona. Dve ručne
 * liste (owner i superadmin) su se već bile razišle — owner varijanta nije
 * brisala Loyalty, Voucher, Referral ni oba chata.
 */
function modelsWithTenantScope(): string[] {
  const dir = path.join(process.cwd(), "src/models");
  return readdirSync(dir)
    .filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f))
    .map((f) => f.replace(/\.ts$/, ""))
    .filter((name) => {
      const src = readFileSync(path.join(dir, `${name}.ts`), "utf8");
      return /\btenantId\b/.test(src);
    });
}

/** Modeli koji NISU tenant podaci iako se pojavljuju u tenant kontekstu. */
const NOT_TENANT_OWNED = new Set([
  "Tenant", // sam salon — briše se posebno, ne kroz `deleteMany({ tenantId })`
]);

/** Kolekcije koje pokriva booking cascade (Slot ide preko `salonId`). */
const COVERED_BY_BOOKING_CASCADE = new Set([
  "BookingReservation",
  "BookingDayLock",
  "BookingOperationReceipt",
  "BookingOutboxEvent",
]);

describe("canonical tenant cascade", () => {
  it("spisak je stvarno pročitan iz izvora", () => {
    // Bez ovoga bi prazan parse učinio sve ostale tvrdnje uzaludnim.
    expect(TENANT_SCOPED_CASCADE.length).toBeGreaterThan(20);
    for (const expected of ["TenantUser", "SalonProfile", "LoyaltyLedger", "SuperAdminChat"]) {
      expect(TENANT_SCOPED_CASCADE).toContain(expected);
    }
  });

  it("pokriva SVAKI model koji nosi tenantId", () => {
    const missing = modelsWithTenantScope().filter(
      (name) =>
        !NOT_TENANT_OWNED.has(name) &&
        !COVERED_BY_BOOKING_CASCADE.has(name) &&
        !TENANT_SCOPED_CASCADE.includes(name),
    );

    expect(
      missing,
      "Model ima `tenantId` a nije u canonical cascade-u — njegovi podaci bi " +
        "preživeli brisanje salona. Dodaj ga u `tenantScopedModels()`.",
    ).toEqual([]);
  });

  it("ne briše Category — to je platformska taksonomija, ne tenant podatak", () => {
    // `Category.deleteMany({ tenantId })` je bio no-op, ali bi uz
    // `strictQuery: true` obrisao globalnu taksonomiju cele platforme.
    expect(TENANT_SCOPED_CASCADE).not.toContain("Category");
    const category = readFileSync(
      path.join(process.cwd(), "src/models/Category.ts"),
      "utf8",
    );
    expect(category).not.toMatch(/\btenantId\b/);
  });

  it("obe delete rute koriste isti servis, bez sopstvene cascade liste", () => {
    for (const route of [
      "src/app/api/tenant-auth/delete-account/route.ts",
      "src/app/api/superadmin/tenants/[tenantId]/route.ts",
    ]) {
      const src = readFileSync(path.join(process.cwd(), route), "utf8");
      expect(src, `${route} mora koristiti deleteTenantPermanently`).toContain(
        "deleteTenantPermanently",
      );
      // Nijedna ruta ne sme ponovo da nabraja kolekcije.
      const manualDeletes = src.match(/\w+\.deleteMany\(/g) ?? [];
      expect(manualDeletes, `${route} ima sopstveni cascade`).toEqual([]);
    }
  });

  it("superadmin zadržava zabranu brisanja salona u pretplati", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/app/api/superadmin/tenants/[tenantId]/route.ts"),
      "utf8",
    );
    expect(src).toContain("TENANT_HAS_ACTIVE_SUBSCRIPTION");
    expect(src).toMatch(/past_due/);
  });
});

/** Nijedan delete u repou ne sme da bude neograničen ili uslovno neograničen. */
describe("brisanje uvek nosi tenant scope", () => {
  function productionFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(path.join(process.cwd(), dir))) {
      const rel = path.join(dir, entry);
      if (statSync(path.join(process.cwd(), rel)).isDirectory()) {
        if (entry === "node_modules") continue;
        productionFiles(rel, acc);
      } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
        acc.push(rel);
      }
    }
    return acc;
  }

  it("nema deleteMany({}) u produkcionom kodu", () => {
    const offenders = productionFiles("src").filter((file) =>
      /deleteMany\(\s*\{\s*\}\s*\)/.test(
        readFileSync(path.join(process.cwd(), file), "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });
});
