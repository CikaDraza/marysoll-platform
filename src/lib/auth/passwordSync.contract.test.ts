import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Credential synchronization contract.
 *
 * Dok `TenantUser.password` i `AuthUser.passwordHash` oba postoje, moraju
 * predstavljati istu aktuelnu lozinku. Divergencija je već jednom prošla
 * neopaženo (`/api/auth/change-password` je menjao samo `TenantUser`), pa je
 * nalog ostao zaključan kada je jedan zapis nestao.
 *
 * Guard je statički: pravi test upisa traži bazu, a cilj je da nova ruta ne
 * može tiho da uvede treću, nesinhronizovanu putanju.
 */
function productionFiles(dir = "src", acc: string[] = []): string[] {
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

/** Rute kojima je `AuthUser.passwordHash` jedini autoritet (nema TenantUser). */
const AUTHUSER_ONLY = new Set([
  "src/app/api/superadmin/change-password/route.ts",
  "src/app/api/seed/superadmin/route.ts",
  "src/app/api/auth/reset-password/route.ts",
]);

/** Rute koje prave OBA zapisa odjednom, istim hash-om (registracija). */
const CREATES_BOTH = new Set(["src/app/api/tenants/register/route.ts"]);

/** Klijentski nalozi bez `authUserId` — samo `TenantUser.password`. */
const CLIENT_ONLY = new Set(["src/app/api/tenant-auth/register/route.ts"]);

describe("password write putanje", () => {
  it("svaka rutа koja piše TenantUser.password ide kroz helper ili je izuzeta", () => {
    const writers = productionFiles().filter((file) => {
      const src = readFileSync(path.join(process.cwd(), file), "utf8");
      return /\bpassword\s*=\s*await bcrypt\.hash|\bpassword:\s*await bcrypt\.hash|profileUpdate\.password\s*=/.test(
        src,
      );
    });

    const unsynced = writers.filter((file) => {
      if (AUTHUSER_ONLY.has(file) || CREATES_BOTH.has(file) || CLIENT_ONLY.has(file)) {
        return false;
      }
      const src = readFileSync(path.join(process.cwd(), file), "utf8");
      return !src.includes("hashPasswordAndSyncAuthUser");
    });

    expect(
      unsynced,
      "Ruta piše TenantUser.password bez `hashPasswordAndSyncAuthUser` — dva " +
        "store-a bi se razišla. Koristi helper iz `lib/auth/passwordSync.ts`.",
    ).toEqual([]);
  });

  it("registracija vlasnika koristi ISTI hash za oba store-a", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/app/api/tenants/register/route.ts"),
      "utf8",
    );
    // Jedna promenljiva, dva upisa — nikad dva odvojena `bcrypt.hash` poziva.
    expect(src).toMatch(/passwordHash:\s*hashedPassword/);
    expect(src).toMatch(/password:\s*hashedPassword/);
    expect((src.match(/bcrypt\.hash\(/g) ?? []).length).toBe(1);
  });

  it("change-password i reset-password sinhronizuju kroz helper", () => {
    for (const route of [
      "src/app/api/auth/change-password/route.ts",
      "src/app/api/auth/reset-password/route.ts",
    ]) {
      const src = readFileSync(path.join(process.cwd(), route), "utf8");
      expect(src, route).toContain("hashPasswordAndSyncAuthUser");
    }
  });

  it("reset preko AuthUser tokena prepisuje i vezane TenantUser zapise", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/app/api/auth/reset-password/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/TenantUser\.updateMany\(/);
  });

  it("detektor stvarno hvata nesinhronizovanu rutu", () => {
    // Guard bi bio bezvredan da mu regex ne pogađa realan oblik upisa.
    const bad = `profileUpdate.password = await bcrypt.hash(password, 12);`;
    expect(
      /\bpassword\s*=\s*await bcrypt\.hash|profileUpdate\.password\s*=/.test(bad),
    ).toBe(true);
  });
});
