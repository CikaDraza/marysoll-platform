import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/mongodb", () => ({
  connectToDB: vi.fn(async () => mongoose),
}));

const MB = 1024 * 1024;
const cloudinaryResources = vi.fn();
vi.mock("@/lib/cloudinary", () => ({
  cloudinary: {
    api: {
      usage: vi.fn(async () => ({
        storage: { usage: 250 * MB, limit: 25 * 1024 * MB },
        bandwidth: { usage: 0 },
        transformations: { usage: 0 },
        requests: 10,
        resources: 42,
      })),
      resources: (...args: unknown[]) => cloudinaryResources(...args),
    },
  },
}));

import { Appointment } from "@/models/Appointment";
import { PlatformUsageHistory } from "@/models/PlatformUsageHistory";
import { PlatformUsageSnapshot } from "@/models/PlatformUsageSnapshot";
import { ResourceQuotaCalibration } from "@/models/ResourceQuotaCalibration";
import { Subscription } from "@/models/Subscription";
import { Tenant } from "@/models/Tenant";
import { TenantUsageHistory } from "@/models/TenantUsageHistory";
import { TenantUser } from "@/models/TenantUser";
import { readPlatformUsage, refreshPlatformUsage } from "./platformUsage";

let mongo: MongoMemoryServer;

const ANJA = new Types.ObjectId();
const UNPAID_KIKI = new Types.ObjectId();
const PADDLE_CLAUDIA = new Types.ObjectId();

describe.sequential("platform usage refresh", () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "platform-usage" });

    cloudinaryResources.mockImplementation(
      async ({ prefix }: { prefix: string }) => ({
        resources:
          prefix === "tenants/anja"
            ? [{ bytes: 4 * MB }, { bytes: 2 * MB }]
            : [{ bytes: 1 * MB }],
      }),
    );

    await Tenant.collection.insertMany([
      {
        _id: ANJA,
        name: "The Lash Room",
        slug: "the-lash-room-by-anja",
        plan: "maria",
        cloudinaryFolder: "tenants/anja",
      },
      // Sirovi Tenant.plan kaže kiki, ali plan nije plaćen → efektivno maria.
      {
        _id: UNPAID_KIKI,
        name: "Neplaćeni Kiki",
        slug: "unpaid-kiki",
        plan: "kiki",
        paid: false,
        cloudinaryFolder: "tenants/unpaid",
      },
      // Sirovi Tenant.plan kaže maria, ali aktivna Paddle pretplata daje claudia.
      {
        _id: PADDLE_CLAUDIA,
        name: "Paddle Claudia",
        slug: "paddle-claudia",
        plan: "maria",
        cloudinaryFolder: "tenants/paddle",
      },
    ]);
    await Subscription.collection.insertOne({
      tenantId: PADDLE_CLAUDIA,
      plan: "claudia",
      status: "active",
      billingProvider: "paddle",
    });
    await TenantUser.collection.insertMany([
      {
        tenantId: ANJA,
        email: "anja@example.com",
        name: "Anja",
        role: "OWNER",
        status: "active",
      },
      {
        tenantId: ANJA,
        email: "klijent@example.com",
        name: "Klijent",
        role: "USER",
        status: "active",
      },
    ]);
    await Appointment.collection.insertMany(
      Array.from({ length: 5 }, (_, i) => ({
        tenantId: ANJA,
        clientProfileId: new Types.ObjectId(),
        clientName: "Klijent",
        clientEmail: "klijent@example.com",
        serviceName: "Lash lift",
        date: `2026-10-0${i + 1}`,
        time: "10:00",
        duration: 60,
        status: "pending",
      })),
    );
    await ResourceQuotaCalibration.create({
      sourceTenantId: ANJA,
      sourceTenantName: "The Lash Room",
      sourceTenantSlug: "the-lash-room-by-anja",
      mongoMb: 0.2,
      cloudinaryMb: 6,
      sourceSnapshotSyncedAt: new Date("2026-08-13T19:43:00Z"),
      capturedAt: new Date("2026-09-30T10:00:00Z"),
      capturedBy: new Types.ObjectId(),
    });
  }, 90_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  it("appends history on every refresh without touching the calibration", async () => {
    const calibrationBefore = await ResourceQuotaCalibration.find({}).lean();

    await refreshPlatformUsage("manual");
    await refreshPlatformUsage("cron");

    const calibrationAfter = await ResourceQuotaCalibration.find({}).lean();
    expect(calibrationAfter).toEqual(calibrationBefore);

    // Latest cache ostaje jedan dokument po provideru.
    expect(await PlatformUsageSnapshot.countDocuments()).toBe(3);

    const platformRows = await PlatformUsageHistory.find({})
      .sort({ capturedAt: 1 })
      .lean<
        Array<{
          source: string;
          cloudinaryStorageUsedMb: number;
          tenantCount: number;
          captureId: Types.ObjectId;
        }>
      >();
    expect(platformRows.map((row) => row.source)).toEqual(["manual", "cron"]);
    expect(platformRows[0]).toMatchObject({
      cloudinaryStorageUsedMb: 250,
      tenantCount: 3,
    });

    const anjaRows = await TenantUsageHistory.find({ tenantId: ANJA })
      .sort({ capturedAt: 1 })
      .lean<
        Array<{
          captureId: Types.ObjectId;
          cloudinaryMb: number;
          mongoEstimateMb: number;
          activeStaffCount: number;
          plan: string;
        }>
      >();
    expect(anjaRows).toHaveLength(2);
    expect(anjaRows[0].captureId.toString()).toBe(
      platformRows[0].captureId.toString(),
    );
    expect(anjaRows[0]).toMatchObject({
      cloudinaryMb: 6,
      activeStaffCount: 1,
      plan: "maria",
    });
    expect(anjaRows[0].mongoEstimateMb).toBeGreaterThan(0);
  });

  it("resolves quota plans through resolveEffectivePlan, not raw Tenant.plan", async () => {
    const plans = new Map(
      (
        await TenantUsageHistory.find({ source: "cron" })
          .select("tenantId plan")
          .lean<Array<{ tenantId: Types.ObjectId; plan: string }>>()
      ).map((row) => [row.tenantId.toString(), row.plan]),
    );
    expect(plans.get(UNPAID_KIKI.toString())).toBe("maria");
    expect(plans.get(PADDLE_CLAUDIA.toString())).toBe("claudia");

    const usage = await readPlatformUsage();
    const rows = new Map(
      usage.tenantUsage!.data.tenants.map((row) => [row.tenantId, row]),
    );
    expect(rows.get(UNPAID_KIKI.toString())?.plan).toBe("maria");
    expect(rows.get(PADDLE_CLAUDIA.toString())).toMatchObject({
      plan: "claudia",
      quotas: { mongoStorageMb: 0.4, cloudinaryStorageMb: 12 },
    });
  });
});
