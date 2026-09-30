import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { snapshotLean, snapshotExists } = vi.hoisted(() => ({
  snapshotLean: vi.fn(),
  snapshotExists: vi.fn(),
}));
vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => undefined) }));
vi.mock("@/models/PlatformUsageSnapshot", () => ({
  PlatformUsageSnapshot: {
    findOne: vi.fn(() => ({
      select: vi.fn(() => ({ lean: snapshotLean })),
    })),
    exists: snapshotExists,
  },
}));
vi.mock("@/models/ResourceQuotaCalibration", () => ({
  ResourceQuotaCalibration: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock("@/models/Tenant", () => ({ Tenant: { findOne: vi.fn() } }));

import {
  captureResourceQuotaCalibration,
  findCalibrationCandidate,
} from "./resourceQuotaCalibration";

const snapshot = {
  syncedAt: new Date("2026-08-13T19:43:01.657Z"),
  data: {
    tenants: [
      {
        tenantId: "6a329773f65185c5070c77fa",
        name: "The LASH ROOM by Anja",
        slug: "the-lash-room-by-anja",
        dbEstimateMb: 0.204,
        mediaMb: 6.728,
      },
    ],
    totalDbEstimateMb: 0.204,
    totalMediaMb: 6.728,
    topByDb: null,
    topByMedia: null,
  },
};

describe("resource quota calibration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds the canonical Anja tenant in the latest tenant usage snapshot", () => {
    expect(findCalibrationCandidate(snapshot)).toEqual({
      tenantId: "6a329773f65185c5070c77fa",
      name: "The LASH ROOM by Anja",
      slug: "the-lash-room-by-anja",
      mongoMb: 0.204,
      cloudinaryMb: 6.728,
      snapshotSyncedAt: "2026-08-13T19:43:01.657Z",
    });
  });

  it("does not produce a candidate without a usage snapshot", () => {
    expect(findCalibrationCandidate(null)).toBeNull();
  });

  it("rejects explicit calibration when no usage snapshot exists", async () => {
    snapshotLean.mockResolvedValueOnce(null);
    snapshotExists.mockResolvedValueOnce(null);

    await expect(
      captureResourceQuotaCalibration("507f1f77bcf86cd799439011"),
    ).rejects.toMatchObject({ code: "SNAPSHOT_MISSING" });
  });
});
