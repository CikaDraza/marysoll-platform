import { describe, it, expect } from "vitest";
import {
  INTEGRITY_CHECKS,
  getCheckDefinition,
} from "./registry";
import {
  buildReport,
  compareBalances,
  completedResult,
  expectedBalancesFromLedger,
  failedResult,
  findMissingReferences,
  makeFinding,
  maxSeverity,
  summarizeResults,
  toModuleResult,
} from "./evaluate";
import { FINDINGS_MAX, type IntegrityFinding } from "./types";

function finding(
  severity: IntegrityFinding["severity"],
  id = "u1",
): IntegrityFinding {
  return makeFinding({
    checkKey: "appointment.client.invalid",
    severity,
    subject: { model: "Appointment", id },
    message: "test nalaz",
  });
}

describe("integrity registry", () => {
  it("sadrži tačno 11 provera iz spec-a, jedinstvene ključeve", () => {
    expect(INTEGRITY_CHECKS).toHaveLength(11);
    const keys = INTEGRITY_CHECKS.map((c) => c.key);
    expect(new Set(keys).size).toBe(11);
    expect(keys).toEqual([
      "client.identity.duplicates",
      "client.identity.mergedReferences",
      "client.identity.invalidReferences",
      "loyalty.account.orphans",
      "loyalty.account.duplicates",
      "loyalty.ledger.mismatch",
      "loyalty.balance.mismatch",
      "voucher.owner.invalid",
      "appointment.client.invalid",
      "seo.tenant.metadata",
      "notifications.push.subscriptions",
    ]);
  });

  it("svaka provera ima naziv, opis, severity i repair preporuku", () => {
    for (const c of INTEGRITY_CHECKS) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
      expect(["error", "warning", "info"]).toContain(c.defaultSeverity);
      expect(c.repair.length).toBeGreaterThan(0);
    }
  });

  it("severity mapa prati spec (error/warning/info po ključu)", () => {
    const sev = (k: string) => getCheckDefinition(k).defaultSeverity;
    expect(sev("client.identity.duplicates")).toBe("info");
    expect(sev("client.identity.mergedReferences")).toBe("warning");
    expect(sev("client.identity.invalidReferences")).toBe("error");
    expect(sev("loyalty.account.orphans")).toBe("error");
    expect(sev("loyalty.account.duplicates")).toBe("warning");
    expect(sev("loyalty.ledger.mismatch")).toBe("error");
    expect(sev("loyalty.balance.mismatch")).toBe("warning");
    expect(sev("voucher.owner.invalid")).toBe("warning");
    expect(sev("appointment.client.invalid")).toBe("error");
    expect(sev("notifications.push.subscriptions")).toBe("info");
  });

  it("nepoznat ključ baca (registry je izvor istine)", () => {
    expect(() => getCheckDefinition("ne.postoji")).toThrow();
  });
});

describe("findMissingReferences", () => {
  it("vraća reference kojih nema među postojećim, dedupe", () => {
    const missing = findMissingReferences(
      ["a", "b", "a", "c"],
      ["b"],
    );
    expect(missing).toEqual(["a", "c"]);
  });

  it("radi sa ObjectId-like objektima (toString)", () => {
    const oid = (s: string) => ({ toString: () => s });
    const missing = findMissingReferences([oid("x"), "y"], [oid("y")]);
    expect(missing).toEqual(["x"]);
  });

  it("prazno kad je sve pokriveno", () => {
    expect(findMissingReferences(["a"], ["a", "b"])).toEqual([]);
  });
});

describe("expectedBalancesFromLedger", () => {
  it("sabira signed iznose po valuti (ogledalo recomputeAccount)", () => {
    const balances = expectedBalancesFromLedger([
      { currency: "hearts", amount: 3 },
      { currency: "hearts", amount: -1 },
      { currency: "points", amount: 120 },
      { currency: "points", amount: 26 },
    ]);
    expect(balances).toEqual({ hearts: 2, points: 146 });
  });

  it("ignoriše nepoznate valute i ne-brojeve", () => {
    const balances = expectedBalancesFromLedger([
      { currency: "gems", amount: 999 },
      { currency: "hearts", amount: Number.NaN },
    ]);
    expect(balances).toEqual({ hearts: 0, points: 0 });
  });
});

describe("compareBalances", () => {
  it("null kada se slažu", () => {
    expect(
      compareBalances({ hearts: 3, points: 120 }, { hearts: 3, points: 120 }),
    ).toBeNull();
  });

  it("vraća samo valute koje odstupaju", () => {
    const mismatch = compareBalances(
      { hearts: 3, points: 120 },
      { hearts: 3, points: 146 },
    );
    expect(mismatch).toEqual({ points: { stored: 120, computed: 146 } });
  });
});

describe("maxSeverity", () => {
  it("error > warning > info; null za prazno", () => {
    expect(maxSeverity([])).toBeNull();
    expect(maxSeverity([finding("info")])).toBe("info");
    expect(maxSeverity([finding("info"), finding("warning")])).toBe("warning");
    expect(
      maxSeverity([finding("warning"), finding("error"), finding("info")]),
    ).toBe("error");
  });
});

describe("makeFinding cap-ovi", () => {
  it("seče predugačku poruku i preveliki evidence", () => {
    const f = makeFinding({
      checkKey: "loyalty.balance.mismatch",
      severity: "warning",
      subject: { model: "LoyaltyAccount", id: "a1" },
      message: "x".repeat(1000),
      evidence: { blob: "y".repeat(5000) },
    });
    expect(f.message.length).toBeLessThanOrEqual(300);
    expect(f.evidence).toEqual({ truncated: true });
  });
});

describe("completedResult", () => {
  it("0 nalaza = zdrava provera (status completed, severity null)", () => {
    const r = completedResult({
      key: "loyalty.balance.mismatch",
      findings: [],
      scanned: 42,
      ms: 5,
    });
    expect(r.status).toBe("completed");
    expect(r.severity).toBeNull();
    expect(r.totalFindings).toBe(0);
    expect(r.error).toBeNull();
    expect(r.scanned).toBe(42);
  });

  it("seče findings na FINDINGS_MAX, totalFindings čuva pravi broj, severity pre odsecanja", () => {
    const many = Array.from({ length: FINDINGS_MAX + 10 }, (_, i) =>
      finding("info", `u${i}`),
    );
    // error nalaz posle cap granice — severity mora da ga vidi
    many.push(finding("error", "poslednji"));
    const r = completedResult({
      key: "appointment.client.invalid",
      findings: many,
      ms: 12,
    });
    expect(r.findings).toHaveLength(FINDINGS_MAX);
    expect(r.totalFindings).toBe(FINDINGS_MAX + 11);
    expect(r.severity).toBe("error");
  });
});

describe("failedResult — greška kolektora NIJE '0 problema'", () => {
  it("status failed sa razlogom, bez zaključka o podacima", () => {
    const r = failedResult({
      key: "loyalty.ledger.mismatch",
      error: new Error("Mongo timeout"),
      ms: 30000,
    });
    expect(r.status).toBe("failed");
    expect(r.error).toContain("Provera nije izvršena");
    expect(r.error).toContain("Mongo timeout");
    expect(r.severity).toBeNull();
    expect(r.findings).toEqual([]);
  });

  it("razlikuje se od zdrave provere sa 0 nalaza", () => {
    const healthy = completedResult({
      key: "loyalty.ledger.mismatch",
      findings: [],
      ms: 1,
    });
    const failed = failedResult({
      key: "loyalty.ledger.mismatch",
      error: "query failed",
      ms: 1,
    });
    expect(healthy.status).not.toBe(failed.status);
    expect(healthy.error).toBeNull();
    expect(failed.error).not.toBeNull();
  });
});

describe("summarizeResults + buildReport", () => {
  it("broji provere po najvišem severity-ju + neizvršene", () => {
    const results = [
      completedResult({ key: "appointment.client.invalid", findings: [finding("error")], ms: 1 }),
      completedResult({ key: "voucher.owner.invalid", findings: [finding("warning")], ms: 1 }),
      completedResult({ key: "client.identity.duplicates", findings: [finding("info")], ms: 1 }),
      completedResult({ key: "loyalty.balance.mismatch", findings: [], ms: 1 }),
      failedResult({ key: "loyalty.ledger.mismatch", error: "x", ms: 1 }),
    ];
    expect(summarizeResults(results)).toEqual({
      errors: 1,
      warnings: 1,
      infos: 1,
      failedChecks: 1,
    });

    const report = buildReport({
      tenantId: { toString: () => "t1" },
      results,
    });
    expect(report.tenantId).toBe("t1");
    expect(report.summary.failedChecks).toBe(1);
    expect(Date.parse(report.ranAt)).not.toBeNaN();
  });
});

describe("toModuleResult (most ka browser kontraktu)", () => {
  it("failed → fail sa 'Provera nije izvršena'", () => {
    const m = toModuleResult(
      failedResult({ key: "loyalty.ledger.mismatch", error: "boom", ms: 2 }),
    );
    expect(m.state).toBe("fail");
    expect(m.detail).toContain("Provera nije izvršena");
  });

  it("error→fail, warning→warn, info→info, zdravo→ok", () => {
    const by = (sev: IntegrityFinding["severity"] | null) =>
      toModuleResult(
        completedResult({
          key: "appointment.client.invalid",
          findings: sev ? [finding(sev)] : [],
          ms: 1,
        }),
      ).state;
    expect(by("error")).toBe("fail");
    expect(by("warning")).toBe("warn");
    expect(by("info")).toBe("info");
    expect(by(null)).toBe("ok");
  });
});
