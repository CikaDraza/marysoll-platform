import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { command, stats, serverStatus } = vi.hoisted(() => ({
  command: vi.fn(),
  stats: vi.fn(),
  serverStatus: vi.fn(),
}));
vi.mock("@/lib/db/mongodb", () => ({
  connectToDB: vi.fn(async () => ({
    connection: { db: { command, stats, admin: () => ({ serverStatus }) } },
  })),
}));

import { getMongoUsage } from "./platformUsage";

const MB = 1024 * 1024;

describe("Mongo Atlas quota measurement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stats.mockResolvedValue({
      dataSize: 30 * MB,
      storageSize: 18 * MB,
      indexSize: 5 * MB,
      collections: 8,
    });
    serverStatus.mockResolvedValue({ connections: { current: 4 } });
  });

  it("uses atlasSize data + indexes as the primary cluster quota metric", async () => {
    command.mockResolvedValue({
      totals: { dataSize: 30 * MB, indexSize: 5 * MB },
      atlasSize: 40 * MB,
      ok: 1,
    });
    const usage = await getMongoUsage();
    expect(command).toHaveBeenCalledWith({ atlasSize: 1 });
    expect(usage).toMatchObject({
      quotaUsedMb: 40,
      quotaSource: "atlasSize",
      dataSizeMb: 30,
      storageSizeMb: 18,
      indexSizeMb: 5,
    });
  });

  it("labels dbStats data + indexes as an estimate, never exact Atlas usage", async () => {
    command.mockRejectedValue(new Error("atlasSize unsupported"));
    const usage = await getMongoUsage();
    expect(usage.quotaUsedMb).toBe(35);
    expect(usage.quotaSource).toBe("dbStatsEstimate");
    expect(usage.quotaUsedMb).not.toBe(usage.storageSizeMb);
  });

  it("does not coerce a malformed atlasSize value into an exact zero", async () => {
    command.mockResolvedValue({ atlasSize: null, ok: 1 });
    const usage = await getMongoUsage();
    expect(usage.quotaSource).toBe("dbStatsEstimate");
    expect(usage.quotaUsedMb).toBe(35);
  });

  it("returns unavailable when neither source has complete fields", async () => {
    command.mockRejectedValue(new Error("atlasSize unsupported"));
    stats.mockResolvedValue({ storageSize: 18 * MB });
    const usage = await getMongoUsage();
    expect(usage.quotaUsedMb).toBeNull();
    expect(usage.quotaSource).toBe("unavailable");
  });
});
