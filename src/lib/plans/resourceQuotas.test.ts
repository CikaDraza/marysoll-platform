import { describe, expect, it } from "vitest";
import {
  buildTenantResourceUsage,
  calculatePlatformEquivalentCapacity,
  getPlanResourceQuota,
  getResourceQuotaStatus,
} from "./resourceQuotas";

const baseline = { mongoMb: 2, cloudinaryMb: 50 };

describe("resource quota model", () => {
  it("uses fixed provisional Mongo soft quotas independent of Anja", () => {
    expect(getPlanResourceQuota("maria")).toEqual({
      mongoStorageMb: 3,
      cloudinaryStorageMb: null,
    });
    expect(getPlanResourceQuota("claudia")).toEqual({
      mongoStorageMb: 6,
      cloudinaryStorageMb: null,
    });
    expect(getPlanResourceQuota("kiki")).toEqual({
      mongoStorageMb: 12,
      cloudinaryStorageMb: null,
    });
    expect(getPlanResourceQuota("enterprise")).toEqual({
      mongoStorageMb: null,
      cloudinaryStorageMb: null,
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
      mongoQuotaUsedMb: 100,
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
      mongoQuotaUsedMb: 10,
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
      mongoComplete: true,
      cloudinaryUsageMb: 50,
      cloudinaryComplete: true,
      cloudinaryAssets: 7,
      updatedAt: "2026-08-13T19:43:01.657Z",
    });
    const serialized = JSON.stringify(usage);

    expect(usage.mongo.percent).toBeCloseTo(33.333, 2);
    expect(usage.cloudinary.percent).toBeNull();
    expect(usage.cloudinaryAssets).toBe(7);
    expect(serialized).not.toContain("storageLimitMb");
    expect(serialized).not.toContain("storageLimitGb");
    expect(serialized).not.toContain("calibration");
    expect(serialized).not.toContain("platformAnjaEquivalentCapacity");
  });
  it("does not turn failed measurements into zero or upgrade recommendations", () => {
    const usage = buildTenantResourceUsage({
      plan: "claudia",
      mongoUsageMb: null,
      mongoComplete: false,
      cloudinaryUsageMb: null,
      cloudinaryComplete: false,
      cloudinaryAssets: null,
      updatedAt: "2026-10-01T00:00:00.000Z",
    });
    expect(usage.mongo.usedMb).toBeNull();
    expect(usage.cloudinary.usedMb).toBeNull();
    expect(usage.status).toBeNull();
    expect(usage.nextPlan).toBeNull();
  });
});
