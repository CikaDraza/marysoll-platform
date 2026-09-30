import { describe, expect, it } from "vitest";
import {
  buildTenantResourceUsage,
  calculatePlatformEquivalentCapacity,
  getPlanResourceQuota,
  getResourceQuotaStatus,
} from "./resourceQuotas";

const baseline = { mongoMb: 2, cloudinaryMb: 50 };

describe("resource quota model", () => {
  it("derives Claudia and Kiki quotas from the captured baseline", () => {
    expect(getPlanResourceQuota("claudia", baseline)).toEqual({
      mongoStorageMb: 4,
      cloudinaryStorageMb: 100,
    });
    expect(getPlanResourceQuota("kiki", baseline)).toEqual({
      mongoStorageMb: 8,
      cloudinaryStorageMb: 200,
    });
  });

  it.each([
    [79, "healthy"],
    [80, "warning"],
    [99.9, "warning"],
    [100, "limit_reached"],
    [140, "limit_reached"],
  ] as const)("maps %s%% to %s", (percent, status) => {
    expect(getResourceQuotaStatus(percent)).toBe(status);
  });

  it("uses 80% safe capacity and selects the smaller provider", () => {
    const capacity = calculatePlatformEquivalentCapacity({
      baseline,
      mongoStorageUsedMb: 100,
      mongoStorageLimitMb: 512,
      cloudinaryStorageUsedMb: 250,
      cloudinaryStorageLimitGb: 25,
    });

    expect(capacity.mongoAnjaEquivalentCapacity).toBe(204);
    expect(capacity.cloudinaryAnjaEquivalentCapacity).toBe(409);
    expect(capacity.platformAnjaEquivalentCapacity).toBe(204);
    expect(capacity.bottleneck).toBe("mongodb");
    expect(capacity.mongoCurrentAnjaEquivalents).toBe(50);
    expect(capacity.cloudinaryCurrentAnjaEquivalents).toBe(5);
  });

  it("returns unavailable values instead of Infinity for a zero baseline", () => {
    const capacity = calculatePlatformEquivalentCapacity({
      baseline: { mongoMb: 0, cloudinaryMb: 0 },
      mongoStorageUsedMb: 10,
      mongoStorageLimitMb: 512,
      cloudinaryStorageUsedMb: 10,
      cloudinaryStorageLimitGb: 25,
    });

    expect(capacity.mongoAnjaEquivalentCapacity).toBeNull();
    expect(capacity.cloudinaryAnjaEquivalentCapacity).toBeNull();
    expect(capacity.platformAnjaEquivalentCapacity).toBeNull();
    expect(capacity.mongoCurrentAnjaEquivalents).toBeNull();
    expect(capacity.cloudinaryCurrentAnjaEquivalents).toBeNull();
  });

  it("builds a tenant-only response without calibration or global capacity data", () => {
    const usage = buildTenantResourceUsage({
      plan: "claudia",
      mongoUsageMb: 2,
      cloudinaryUsageMb: 50,
      updatedAt: "2026-08-13T19:43:01.657Z",
      baseline,
    });
    const serialized = JSON.stringify(usage);

    expect(usage.mongo.percent).toBe(50);
    expect(usage.cloudinary.percent).toBe(50);
    expect(serialized).not.toContain("storageLimitMb");
    expect(serialized).not.toContain("storageLimitGb");
    expect(serialized).not.toContain("calibration");
    expect(serialized).not.toContain("platformAnjaEquivalentCapacity");
  });
});
