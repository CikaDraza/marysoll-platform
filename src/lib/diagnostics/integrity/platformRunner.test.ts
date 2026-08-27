import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("./collectorRegistry", () => ({
  PLATFORM_INTEGRITY_COLLECTORS: {
    "tenant.ownership.orphanAccount": vi.fn(async () => ({
      findings: [],
      scanned: 3,
    })),
  },
}));

import { PLATFORM_INTEGRITY_COLLECTORS } from "./collectorRegistry";
import { runPlatformIntegrityChecks } from "./platformRunner";

beforeEach(() => vi.clearAllMocks());

describe("runPlatformIntegrityChecks", () => {
  it("izvršava samo platform scope i vraća report bez tenantId-a", async () => {
    const run = await runPlatformIntegrityChecks();

    expect(run.scope).toBe("platform");
    expect(run).not.toHaveProperty("tenantId");
    expect(run.results).toHaveLength(1);
    expect(run.results[0]).toMatchObject({
      key: "tenant.ownership.orphanAccount",
      status: "completed",
      scanned: 3,
    });
    expect(PLATFORM_INTEGRITY_COLLECTORS["tenant.ownership.orphanAccount"])
      .toHaveBeenCalledTimes(1);
  });
});
