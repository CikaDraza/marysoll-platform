/**
 * Izolacija tenanta — podaci klijenata ne smeju da procure između salona.
 *
 * Dva sloja provere:
 *   1. čista logika scope-a (`tenantScopeFrom`);
 *   2. GUARD nad stvarnim rutama — svaka ruta koja čita/menja `Appointment`
 *      mora da nosi `tenantId` u upitu ili da bude eksplicitno izuzeta uz razlog.
 *
 * Drugi sloj je bitniji: hvata rutu koju neko doda sutra i zaboravi da je
 * ograniči, što je tačno greška koja je i postojala (`findByIdAndDelete(id)`).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import type { DecodedToken } from "@/types/auth/types";
import { actorScopeFrom, tenantScopeFrom } from "./tenantScope";

const TENANT_A = "6a05c67fabc69a1234567890";
const TENANT_B = "6a05c67fabc69a0987654321";

function token(over: Partial<DecodedToken> = {}): DecodedToken {
  return {
    id: "u1",
    email: "admin@example.com",
    isAdmin: true,
    isSuperAdmin: false,
    tenantId: TENANT_A,
    ...over,
  } as DecodedToken;
}

describe("tenantScopeFrom", () => {
  it("bez tokena → 401", () => {
    expect(tenantScopeFrom(null)).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
  });

  it("tenant admin → upit je ograničen na NJEGOV tenant", () => {
    const scope = tenantScopeFrom(token());
    expect(scope.ok).toBe(true);
    if (!scope.ok) return;
    expect(scope.isSuperAdmin).toBe(false);
    expect(String(scope.filter.tenantId)).toBe(TENANT_A);
  });

  it("tenant admin NE dobija scope drugog tenanta", () => {
    const scope = tenantScopeFrom(token({ tenantId: TENANT_B }));
    if (!scope.ok) throw new Error("očekivan ok");
    expect(String(scope.filter.tenantId)).not.toBe(TENANT_A);
    expect(String(scope.filter.tenantId)).toBe(TENANT_B);
  });

  it("ulogovan bez tenant konteksta → 403, nikad neograničen upit", () => {
    expect(tenantScopeFrom(token({ tenantId: null }))).toEqual({
      ok: false,
      status: 403,
      error: "Forbidden: no tenant context",
    });
  });

  it("neispravan tenantId se tretira kao nedostatak konteksta", () => {
    expect(tenantScopeFrom(token({ tenantId: "nije-objectid" }))).toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("SUPER_ADMIN je jedini neograničen", () => {
    const scope = tenantScopeFrom(token({ isSuperAdmin: true, tenantId: null }));
    if (!scope.ok) throw new Error("očekivan ok");
    expect(scope.isSuperAdmin).toBe(true);
    expect(scope.filter).toEqual({});
  });

  it("klijent (ne-admin) tenanta je i dalje ograničen na svoj tenant", () => {
    const scope = tenantScopeFrom(token({ isAdmin: false }));
    if (!scope.ok) throw new Error("očekivan ok");
    expect(String(scope.filter.tenantId)).toBe(TENANT_A);
  });

  it("filter je upotrebljiv kao Mongo upit (ObjectId, ne string)", () => {
    const scope = tenantScopeFrom(token());
    if (!scope.ok) throw new Error("očekivan ok");
    expect(scope.filter.tenantId).toBeInstanceOf(Types.ObjectId);
  });
});

// ─── Guard nad stvarnim rutama ───────────────────────────────────────────────

const API_DIR = path.join(process.cwd(), "src/app/api");

function routeFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) routeFiles(full, acc);
    else if (entry === "route.ts") acc.push(full);
  }
  return acc;
}

/** Rute koje smeju bez `tenantId` — svaka sa razlogom. */
const ALLOWED_WITHOUT_TENANT_SCOPE: Record<string, string> = {
  "marketplace/appointments/[id]/cancel":
    "klijent otkazuje SVOJ termin — scope je clientEmail, ne tenant",
  "marketplace/appointments/[id]/update":
    "klijent menja SVOJ termin — scope je clientEmail, ne tenant",
};

describe("guard: rute nad terminima nose tenant scope", () => {
  const touching = routeFiles(API_DIR).filter((f) =>
    /Appointment\.(find|countDocuments|aggregate|distinct)/.test(
      readFileSync(f, "utf8"),
    ),
  );

  it("guard uopšte gleda neki skup ruta", () => {
    expect(touching.length).toBeGreaterThan(10);
  });

  it("svaka takva ruta ograničava upit na tenant ili je izuzeta uz razlog", () => {
    const violations: string[] = [];

    for (const file of touching) {
      const rel = path
        .relative(API_DIR, file)
        .replace(/\/route\.ts$/, "")
        .replace(/\\/g, "/");
      const src = readFileSync(file, "utf8");

      if (rel in ALLOWED_WITHOUT_TENANT_SCOPE) continue;
      // Dva ispravna puta: direktan `tenantId` u upitu, ili delegiranje
      // deljenom helperu koji ga garantuje.
      if (/tenantId/.test(src) || /tenantScopeFrom/.test(src)) continue;

      violations.push(rel);
    }

    expect(violations, "rute bez tenant scope-a").toEqual([]);
  });

  it("izuzete rute stvarno postoje (spisak ne sme da zastari)", () => {
    const all = routeFiles(API_DIR).map((f) =>
      path.relative(API_DIR, f).replace(/\/route\.ts$/, "").replace(/\\/g, "/"),
    );
    for (const rel of Object.keys(ALLOWED_WITHOUT_TENANT_SCOPE)) {
      expect(all, `izuzetak pokazuje na nepostojeću rutu: ${rel}`).toContain(rel);
    }
  });

  it("ne postoji javna ruta koja vraća sve termine", () => {
    for (const file of routeFiles(API_DIR)) {
      const src = readFileSync(file, "utf8");
      expect(
        /Appointment\.find\(\s*\{\s*\}\s*\)/.test(src),
        `${file} radi Appointment.find({}) — vraća termine svih tenanta`,
      ).toBe(false);
    }
  });
});

// ─── Vlasništvo nad zapisom, ne samo tenant ──────────────────────────────────

const CLIENT_1 = "6a05c67fabc69a1111111111";
const CLIENT_2 = "6a05c67fabc69a2222222222";

describe("actorScopeFrom", () => {
  it("bez tokena → 401", () => {
    expect(actorScopeFrom(null)).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
  });

  it("tenant admin: scope je salon, bez vlasništva nad pojedinačnim terminom", () => {
    const scope = actorScopeFrom(token());
    if (!scope.ok) throw new Error("očekivan ok");
    expect(scope.actor).toBe("admin");
    expect(String(scope.filter.tenantId)).toBe(TENANT_A);
    expect(scope.filter.clientProfileId).toBeUndefined();
  });

  it("klijent: scope je salon I NJEGOV zapis", () => {
    const scope = actorScopeFrom(
      token({ isAdmin: false, tenantUserId: CLIENT_1 }),
    );
    if (!scope.ok) throw new Error("očekivan ok");
    expect(scope.actor).toBe("client");
    expect(String(scope.filter.tenantId)).toBe(TENANT_A);
    expect(String(scope.filter.clientProfileId)).toBe(CLIENT_1);
  });

  it("klijent NE dobija scope tuđeg klijenta iz istog salona", () => {
    const scope = actorScopeFrom(
      token({ isAdmin: false, tenantUserId: CLIENT_2 }),
    );
    if (!scope.ok) throw new Error("očekivan ok");
    expect(String(scope.filter.clientProfileId)).not.toBe(CLIENT_1);
  });

  it("klijent bez `tenantUserId` → 403, nikad upit bez vlasništva", () => {
    expect(
      actorScopeFrom(token({ isAdmin: false, tenantUserId: null })),
    ).toEqual({
      ok: false,
      status: 403,
      error: "Forbidden: no client context",
    });
  });

  it("klijent nikad ne dobija admin privilegije preko scope-a", () => {
    const scope = actorScopeFrom(
      token({ isAdmin: false, tenantUserId: CLIENT_1 }),
    );
    if (!scope.ok) throw new Error("očekivan ok");
    expect(scope.actor).not.toBe("admin");
    expect(scope.isSuperAdmin).toBe(false);
  });

  it("SUPER_ADMIN je i ovde jedini neograničen", () => {
    const scope = actorScopeFrom(token({ isSuperAdmin: true, tenantId: null }));
    if (!scope.ok) throw new Error("očekivan ok");
    expect(scope.actor).toBe("superadmin");
    expect(scope.filter).toEqual({});
  });

  it("filter je upotrebljiv kao Mongo upit (ObjectId, ne string)", () => {
    const scope = actorScopeFrom(
      token({ isAdmin: false, tenantUserId: CLIENT_1 }),
    );
    if (!scope.ok) throw new Error("očekivan ok");
    expect(scope.filter.tenantId).toBeInstanceOf(Types.ObjectId);
    expect(scope.filter.clientProfileId).toBeInstanceOf(Types.ObjectId);
  });
});

describe("guard: termin se ne dohvata po golom ID-ju", () => {
  /**
   * Precizna dopuna guarda iznad. Onaj test traži samo POJAVU reči `tenantId`
   * bilo gde u fajlu, pa su `appointments/update/[id]` i `appointments/message`
   * godinama prolazile iako su termin dohvatale sa `findById(id)` — reč
   * `tenantId` je bila u payload-u notifikacije, ne u upitu.
   *
   * `findById` / `findByIdAndUpdate` / `findByIdAndDelete` primaju SAMO id, pa
   * u njih tenant filter ne može ni da se ugradi. Ispravan oblik je
   * `findOne({ _id, ...scope.filter })`.
   */
  it("nijedna API ruta ne koristi Appointment.findById*", () => {
    const offenders = routeFiles(API_DIR)
      .filter((f) => /Appointment\.findById/.test(readFileSync(f, "utf8")))
      .map((f) =>
        path.relative(API_DIR, f).replace(/\/route\.ts$/, "").replace(/\\/g, "/"),
      );

    expect(offenders, "rute koje dohvataju termin bez scope-a").toEqual([]);
  });
});
