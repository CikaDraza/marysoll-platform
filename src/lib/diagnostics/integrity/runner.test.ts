import { beforeEach, describe, expect, it, vi } from "vitest";

const collect = vi.hoisted(() =>
  vi.fn(async () => ({ findings: [], scanned: 0 })),
);

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("./collectorRegistry", () => ({
  TENANT_INTEGRITY_COLLECTORS: {
    "client.identity.duplicates": collect,
    "client.identity.mergedReferences": collect,
    "client.identity.invalidReferences": collect,
    "loyalty.account.orphans": collect,
    "loyalty.account.duplicates": collect,
    "loyalty.ledger.mismatch": collect,
    "loyalty.balance.mismatch": collect,
    "voucher.owner.invalid": collect,
    "appointment.client.invalid": collect,
    "seo.tenant.metadata": collect,
    "tenant.ownership.missing": collect,
    "notifications.push.subscriptions": collect,
    "payment.appointment.overpaid": collect,
  },
}));

import { runIntegrityChecks } from "./runner";

beforeEach(() => vi.clearAllMocks());

describe("runIntegrityChecks tenant scope", () => {
  it("izvršava svih 13 tenant provera i ne pokušava platform orphan check", async () => {
    const report = await runIntegrityChecks("tenant-1");

    expect(report.results).toHaveLength(13);
    expect(report.results.every((result) => result.status === "completed")).toBe(true);
    expect(report.results.map((result) => result.key)).not.toContain(
      "tenant.ownership.orphanAccount",
    );
    expect(report.results.map((result) => result.key)).toContain(
      "tenant.ownership.missing",
    );
    expect(collect).toHaveBeenCalledTimes(13);
  });
});
