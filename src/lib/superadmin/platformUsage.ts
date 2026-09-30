/**
 * lib/superadmin/platformUsage.ts
 *
 * SERVER-ONLY — nikad ne importovati u Client Components ili hooks!
 *
 * Sakuplja infrastrukturnu potrošnju platforme (MongoDB + Cloudinary) i procenu
 * po tenantu. Spoljni pozivi (Cloudinary Admin API, db admin komande) se rade SAMO
 * u `refreshPlatformUsage()` — dashboard čita keširani `PlatformUsageSnapshot`.
 * Svaki refresh (ručni ili dnevni cron) dodatno upisuje append-only istoriju
 * (`TenantUsageHistory` + `PlatformUsageHistory`) za mesečni rast potrošnje.
 */
import "server-only";

import { cloudinary, getTenantCloudinaryUsage } from "@/lib/cloudinary";
import { connectToDB } from "@/lib/db/mongodb";
import {
  PlatformUsageSnapshot,
  type UsageProvider,
} from "@/models/PlatformUsageSnapshot";
import { Tenant } from "@/models/Tenant";
import { PlatformUsageHistory } from "@/models/PlatformUsageHistory";
import {
  TenantUsageHistory,
  type UsageCaptureSource,
} from "@/models/TenantUsageHistory";
import { countActiveStaffByTenant } from "@/lib/team/activeStaff";
import {
  getCurrentResourceQuotaCalibration,
  readCalibrationCandidate,
} from "@/lib/superadmin/resourceQuotaCalibration";
import {
  buildTenantResourceUsage,
  calculatePlatformEquivalentCapacity,
  getPlanResourceQuota,
} from "@/lib/plans/resourceQuotas";
import { resolveEffectivePlansForTenants } from "@/lib/plans/effectivePlans";
import {
  mongoUsageDataSchema,
  tenantUsageSnapshotDataSchema,
} from "@/types/platform-usage";
import type {
  CloudinaryUsageData,
  MongoUsageData,
  PlatformUsageRead,
  TenantUsageData,
  TenantUsageSnapshotData,
  TenantUsageSnapshotRow,
  UsageCaptureReport,
} from "@/types/platform-usage";

// Tenant-scoped kolekcije korišćene za laku procenu DB potrošnje po tenantu.
import { Appointment } from "@/models/Appointment";
import { Testimonial } from "@/models/Testimonial";
import { Service } from "@/models/Service";
import { TenantUser } from "@/models/TenantUser";
import { NewsletterLog } from "@/models/NewsletterLog";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { AudienceContact } from "@/models/AudienceContact";
import { CampaignEvent } from "@/models/CampaignEvent";
import { EmailCampaign } from "@/models/EmailCampaign";
import { Notification } from "@/models/Notification";
import { SalonInternalChat } from "@/models/SalonInternalChat";
import { SeoMeta } from "@/models/SeoMeta";
import { SalonProfile } from "@/models/SalonProfile";
import { AudienceSegment } from "@/models/AudienceSegment";
import { BookingDayLock } from "@/models/BookingDayLock";
import { BookingOperationReceipt } from "@/models/BookingOperationReceipt";
import { BookingOutboxEvent } from "@/models/BookingOutboxEvent";
import { BookingReservation } from "@/models/BookingReservation";
import { CampaignAnalytics } from "@/models/CampaignAnalytics";
import { ClientContentAssignment } from "@/models/ClientContentAssignment";
import { EducationContent } from "@/models/EducationContent";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { NewsletterTemplate } from "@/models/NewsletterTemplate";
import { Referral } from "@/models/Referral";
import { Subscription } from "@/models/Subscription";
import { SuperAdminChat } from "@/models/SuperAdminChat";
import { Theme8LandingEvent } from "@/models/Theme8LandingEvent";
import { Voucher } from "@/models/Voucher";
import { VoucherRequest } from "@/models/VoucherRequest";
import { WebhookEvent } from "@/models/WebhookEvent";
import { Types, type Model } from "mongoose";

// ─── Konstante / limiti (samo za prikaz) ─────────────────────────────────────
const MONGODB_STORAGE_LIMIT_MB = Number(
  process.env.MONGODB_STORAGE_LIMIT_MB ?? 512, // M0 free tier
);
const CLOUDINARY_STORAGE_LIMIT_GB = Number(
  process.env.CLOUDINARY_STORAGE_LIMIT_GB ?? 25, // free plan storage credit
);

const TENANT_SCOPED_MODELS: Model<unknown>[] = [
  Appointment,
  Testimonial,
  Service,
  TenantUser,
  NewsletterLog,
  NewsletterCampaign,
  AudienceContact,
  CampaignEvent,
  EmailCampaign,
  Notification,
  SalonInternalChat,
  SeoMeta,
  SalonProfile,
  AudienceSegment,
  BookingDayLock,
  BookingOperationReceipt,
  BookingOutboxEvent,
  BookingReservation,
  CampaignAnalytics,
  ClientContentAssignment,
  EducationContent,
  LoyaltyAccount,
  LoyaltyConfig,
  LoyaltyEvent,
  LoyaltyLedger,
  NewsletterTemplate,
  Referral,
  Subscription,
  SuperAdminChat,
  Theme8LandingEvent,
  Voucher,
  VoucherRequest,
  WebhookEvent,
] as Model<unknown>[];

// ─── Helperi ─────────────────────────────────────────────────────────────────
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;

const toMb = (bytes: number) => Math.round((bytes / BYTES_PER_MB) * 10) / 10;
// Veća preciznost za sitne per-tenant procene (baza je mala → KB nivo).
const toMbPrecise = (bytes: number) =>
  Math.round((bytes / BYTES_PER_MB) * 1000) / 1000;
const toGb = (bytes: number) => Math.round((bytes / BYTES_PER_GB) * 100) / 100;

// ─── MongoDB ─────────────────────────────────────────────────────────────────
export async function getMongoUsage(): Promise<MongoUsageData> {
  const mongooseInstance = await connectToDB();
  const db = mongooseInstance.connection.db;
  if (!db) throw new Error("MongoDB konekcija nije dostupna");

  let quotaBytes: number | null = null;
  let quotaSource: MongoUsageData["quotaSource"] = "unavailable";
  try {
    // Atlas Free/Flex: cluster-wide data + indexes, not db.stats().storageSize.
    const response = (await db.command({ atlasSize: 1 })) as Record<
      string,
      unknown
    >;
    const candidate = response.atlasSize;
    if (
      response.ok === 1 &&
      typeof candidate === "number" &&
      Number.isSafeInteger(candidate) &&
      candidate >= 0
    ) {
      quotaBytes = candidate;
      quotaSource = "atlasSize";
    }
  } catch (error) {
    console.warn("MongoDB atlasSize nije dostupan:", error);
  }

  let dataSizeMb: number | null = null;
  let storageSizeMb: number | null = null;
  let indexSizeMb: number | null = null;
  let collections: number | null = null;
  try {
    const stats = (await db.stats()) as {
      dataSize?: number;
      storageSize?: number;
      indexSize?: number;
      collections?: number;
    };
    const validBytes = (value: number | undefined) =>
      typeof value === "number" && Number.isFinite(value) && value >= 0;
    dataSizeMb = validBytes(stats.dataSize) ? toMb(stats.dataSize!) : null;
    storageSizeMb = validBytes(stats.storageSize)
      ? toMb(stats.storageSize!)
      : null;
    indexSizeMb = validBytes(stats.indexSize) ? toMb(stats.indexSize!) : null;
    collections =
      Number.isInteger(stats.collections) && stats.collections! >= 0
        ? stats.collections!
        : null;
    if (
      quotaBytes == null &&
      validBytes(stats.dataSize) &&
      validBytes(stats.indexSize)
    ) {
      quotaBytes = stats.dataSize! + stats.indexSize!;
      quotaSource = "dbStatsEstimate";
    }
  } catch (error) {
    console.warn("MongoDB db.stats dijagnostika nije dostupna:", error);
  }

  let connections: number | null = null;
  try {
    const serverStatus = (await db.admin().serverStatus()) as {
      connections?: { current?: number };
    };
    connections = serverStatus.connections?.current ?? null;
  } catch {
    connections = null;
  }

  return {
    quotaUsedMb: quotaBytes == null ? null : toMb(quotaBytes),
    quotaLimitMb: MONGODB_STORAGE_LIMIT_MB,
    quotaSource,
    dataSizeMb,
    storageSizeMb,
    indexSizeMb,
    connections,
    // M0 does not expose CPU through this connection; M10+ requires Admin API.
    cpuAvgPercent: null,
    collections,
  };
}

// ─── Cloudinary (globalno) ───────────────────────────────────────────────────
export async function getCloudinaryUsage(): Promise<CloudinaryUsageData> {
  const usage = (await cloudinary.api.usage()) as {
    storage?: { usage?: number; limit?: number };
    bandwidth?: { usage?: number };
    transformations?: { usage?: number };
    requests?: number;
    resources?: number;
  };

  const storageBytes = usage.storage?.usage;
  if (
    typeof storageBytes !== "number" ||
    !Number.isFinite(storageBytes) ||
    storageBytes < 0
  ) {
    throw new Error("Cloudinary usage nije vratio validnu storage potrošnju");
  }
  const storageLimitGb = usage.storage?.limit
    ? toGb(usage.storage.limit)
    : CLOUDINARY_STORAGE_LIMIT_GB;

  return {
    storageUsedMb: toMb(storageBytes),
    storageLimitGb,
    assets: usage.resources ?? 0,
    bandwidthGb: toGb(usage.bandwidth?.usage ?? 0),
    transformations: usage.transformations?.usage ?? 0,
    requests: usage.requests ?? null,
  };
}

// ─── Tenant usage (laka procena) ─────────────────────────────────────────────
export async function getTenantUsage(): Promise<TenantUsageSnapshotData> {
  const mongooseInstance = await connectToDB();
  const db = mongooseInstance.connection.db;
  if (!db) throw new Error("MongoDB konekcija nije dostupna");

  const tenants = (await Tenant.find({})
    .select("name slug cloudinaryFolder")
    .lean()) as unknown as {
    _id: { toString(): string };
    name: string;
    slug: string;
    cloudinaryFolder?: string;
  }[];

  const dbBytesByTenant = new Map<string, number>();
  let mongoComplete = true;
  // count(tenant docs) × collection avgObjSize is an estimate, never physical quota.
  for (const Model of TENANT_SCOPED_MODELS) {
    const collName = Model.collection.collectionName;
    let avgObjSize: number;
    try {
      const stats = (await db.command({ collStats: collName })) as {
        avgObjSize?: number;
        count?: number;
      };
      if (stats.count === 0) continue;
      if (
        typeof stats.avgObjSize !== "number" ||
        !Number.isFinite(stats.avgObjSize) ||
        stats.avgObjSize < 0
      ) {
        throw new Error(`Nevalidan avgObjSize za ${collName}`);
      }
      avgObjSize = stats.avgObjSize;
    } catch (error) {
      const mongoError = error as { code?: number; codeName?: string };
      if (
        mongoError.code === 26 ||
        mongoError.codeName === "NamespaceNotFound"
      ) {
        continue; // Collection has never been created: true zero documents.
      }
      console.error(
        `Tenant Mongo estimate nije kompletan (${collName}):`,
        error,
      );
      mongoComplete = false;
      continue;
    }
    if (avgObjSize === 0) continue;
    try {
      const counts = (await Model.aggregate([
        { $group: { _id: "$tenantId", count: { $sum: 1 } } },
      ])) as { _id: { toString(): string } | null; count: number }[];
      for (const row of counts) {
        if (!row._id) continue;
        const id = row._id.toString();
        dbBytesByTenant.set(
          id,
          (dbBytesByTenant.get(id) ?? 0) + row.count * avgObjSize,
        );
      }
    } catch (error) {
      console.error(`Tenant Mongo count nije kompletan (${collName}):`, error);
      mongoComplete = false;
    }
  }

  const rows: TenantUsageSnapshotRow[] = [];
  for (const tenant of tenants) {
    const id = tenant._id.toString();
    let mediaMb: number | null = null;
    let mediaAssets: number | null = null;
    let mediaComplete = false;
    if (tenant.cloudinaryFolder?.trim()) {
      try {
        const media = await getTenantCloudinaryUsage(tenant.cloudinaryFolder);
        mediaMb = toMbPrecise(media.totalBytes);
        mediaAssets = media.assets;
        mediaComplete = true;
      } catch (error) {
        console.error(`Tenant Cloudinary measurement failed (${id}):`, error);
      }
    }
    rows.push({
      tenantId: id,
      name: tenant.name,
      slug: tenant.slug,
      dbEstimateMb: mongoComplete
        ? toMbPrecise(dbBytesByTenant.get(id) ?? 0)
        : null,
      dbEstimateComplete: mongoComplete,
      mediaMb,
      mediaComplete,
      mediaAssets,
    });
  }

  rows.sort(
    (a, b) =>
      (b.mediaMb ?? 0) +
      (b.dbEstimateMb ?? 0) -
      ((a.mediaMb ?? 0) + (a.dbEstimateMb ?? 0)),
  );
  const sum = (values: number[]) =>
    Math.round(values.reduce((total, value) => total + value, 0) * 1000) / 1000;
  const validDb = rows.filter(
    (row) => row.dbEstimateComplete && row.dbEstimateMb != null,
  );
  const validMedia = rows.filter(
    (row) => row.mediaComplete && row.mediaMb != null,
  );
  const topByDb = [...validDb].sort(
    (a, b) => b.dbEstimateMb! - a.dbEstimateMb!,
  )[0];
  const topByMedia = [...validMedia].sort((a, b) => b.mediaMb! - a.mediaMb!)[0];

  return {
    tenants: rows,
    totalDbEstimateMb:
      validDb.length === rows.length
        ? sum(validDb.map((row) => row.dbEstimateMb!))
        : null,
    totalMediaMb:
      validMedia.length === rows.length
        ? sum(validMedia.map((row) => row.mediaMb!))
        : null,
    topByDb: topByDb
      ? { name: topByDb.name, dbEstimateMb: topByDb.dbEstimateMb! }
      : null,
    topByMedia: topByMedia
      ? { name: topByMedia.name, mediaMb: topByMedia.mediaMb! }
      : null,
  };
}

// ─── Refresh (upsert snapshot + ažuriraj Tenant.storageMetrics) ──────────────
async function upsertSnapshot(provider: UsageProvider, data: unknown) {
  await PlatformUsageSnapshot.updateOne(
    { provider },
    { $set: { data, syncedAt: new Date() } },
    { upsert: true },
  );
}

/**
 * Append-only istorija uz latest cache. Latest snapshot služi dashboardu;
 * istorija služi mesečnom rastu (snapshot kraja meseca − snapshot početka).
 */
async function appendUsageHistory(input: {
  source: UsageCaptureSource;
  capturedAt: Date;
  mongo: MongoUsageData | null;
  cloudinary: CloudinaryUsageData | null;
  tenantUsage: TenantUsageSnapshotData | null;
}) {
  const captureId = new Types.ObjectId();
  const { source, capturedAt, mongo, cloudinary, tenantUsage } = input;

  let tenantHistoryCount = 0;
  if (tenantUsage && tenantUsage.tenants.length > 0) {
    const tenantIds = tenantUsage.tenants.map((row) => row.tenantId);
    const [planByTenantId, staffByTenantId] = await Promise.all([
      resolveEffectivePlansForTenants(tenantIds, capturedAt),
      countActiveStaffByTenant(tenantIds),
    ]);
    await TenantUsageHistory.insertMany(
      tenantUsage.tenants.map((row) => ({
        captureId,
        tenantId: row.tenantId,
        capturedAt,
        source,
        plan: planByTenantId.get(row.tenantId) ?? "maria",
        mongoEstimateMb: row.dbEstimateMb,
        mongoEstimateComplete: row.dbEstimateComplete,
        cloudinaryMb: row.mediaMb,
        cloudinaryComplete: row.mediaComplete,
        cloudinaryAssets: row.mediaAssets,
        activeStaffCount: staffByTenantId.get(row.tenantId) ?? 0,
      })),
    );
    tenantHistoryCount = tenantUsage.tenants.length;
  }

  await PlatformUsageHistory.create({
    captureId,
    capturedAt,
    source,
    mongoStorageUsedMb: mongo?.storageSizeMb ?? null,
    mongoStorageLimitMb: mongo?.quotaLimitMb ?? null,
    mongoQuotaUsedMb: mongo?.quotaUsedMb ?? null,
    mongoQuotaSource: mongo?.quotaSource ?? "unavailable",
    mongoDataSizeMb: mongo?.dataSizeMb ?? null,
    mongoIndexSizeMb: mongo?.indexSizeMb ?? null,
    cloudinaryStorageUsedMb: cloudinary?.storageUsedMb ?? null,
    cloudinaryStorageLimitGb: cloudinary?.storageLimitGb ?? null,
    tenantCount: tenantUsage?.tenants.length ?? null,
    tenantMongoEstimateTotalMb: tenantUsage?.totalDbEstimateMb ?? null,
    tenantCloudinaryTotalMb: tenantUsage?.totalMediaMb ?? null,
  });
  return { captureId: captureId.toString(), tenantHistoryCount };
}

export async function refreshPlatformUsage(
  source: UsageCaptureSource = "manual",
): Promise<PlatformUsageRead> {
  await connectToDB();

  const [mongoRes, cloudinaryRes, tenantRes] = await Promise.allSettled([
    getMongoUsage(),
    getCloudinaryUsage(),
    getTenantUsage(),
  ]);
  for (const [name, result] of [
    ["mongodb", mongoRes],
    ["cloudinary", cloudinaryRes],
    ["tenant_usage", tenantRes],
  ] as const) {
    if (result.status === "rejected") {
      console.error(`refreshPlatformUsage: ${name} failed:`, result.reason);
    }
  }

  if (mongoRes.status === "fulfilled") {
    await upsertSnapshot("mongodb", mongoRes.value);
  }
  if (cloudinaryRes.status === "fulfilled") {
    await upsertSnapshot("cloudinary", cloudinaryRes.value);
  }
  if (tenantRes.status === "fulfilled") {
    await upsertSnapshot("tenant_usage", tenantRes.value);
    const now = new Date();
    await Promise.all(
      tenantRes.value.tenants.map((row) =>
        Tenant.updateOne(
          { _id: row.tenantId },
          {
            $set: {
              "storageMetrics.mongoUsageMb": row.dbEstimateMb,
              "storageMetrics.mongoComplete": row.dbEstimateComplete,
              "storageMetrics.cloudinaryUsageMb": row.mediaMb,
              "storageMetrics.cloudinaryComplete": row.mediaComplete,
              "storageMetrics.cloudinaryAssets": row.mediaAssets,
              "storageMetrics.updatedAt": now,
            },
          },
        ),
      ),
    );
  }

  const mongo = mongoRes.status === "fulfilled" ? mongoRes.value : null;
  const cloudinaryUsage =
    cloudinaryRes.status === "fulfilled" ? cloudinaryRes.value : null;
  const tenantUsage = tenantRes.status === "fulfilled" ? tenantRes.value : null;
  let captureId: string | null = null;
  let tenantHistoryCount = 0;
  let historyOk = false;
  try {
    const saved = await appendUsageHistory({
      source,
      capturedAt: new Date(),
      mongo,
      cloudinary: cloudinaryUsage,
      tenantUsage,
    });
    captureId = saved.captureId;
    tenantHistoryCount = saved.tenantHistoryCount;
    historyOk = true;
  } catch (error) {
    console.error("refreshPlatformUsage: history capture failed:", error);
  }

  const tenantComplete =
    tenantUsage != null &&
    tenantUsage.tenants.length > 0 &&
    tenantUsage.tenants.every(
      (row) => row.dbEstimateComplete && row.mediaComplete,
    );
  const providers: UsageCaptureReport["providers"] = {
    mongodb: mongo?.quotaSource === "atlasSize" ? "ok" : "failed",
    cloudinary: cloudinaryUsage ? "ok" : "failed",
    tenantUsage: tenantComplete ? "ok" : "failed",
    history: historyOk ? "ok" : "failed",
  };
  const capture: UsageCaptureReport = {
    captureId,
    status:
      Object.values(providers).every((status) => status === "ok") &&
      tenantHistoryCount > 0
        ? "complete"
        : "partial",
    providers,
    tenantHistoryCount,
  };
  return { ...(await readPlatformUsage()), capture };
}

// ─── Read (samo iz snapshot-a — bez spoljnih poziva) ─────────────────────────
export async function readPlatformUsage(): Promise<PlatformUsageRead> {
  await connectToDB();

  const [snapshots, calibration, calibrationCandidate] = (await Promise.all([
    PlatformUsageSnapshot.find({}).lean(),
    getCurrentResourceQuotaCalibration(),
    readCalibrationCandidate(),
  ])) as unknown as [
    Array<{
      provider: UsageProvider;
      data: Record<string, unknown>;
      syncedAt: Date;
    }>,
    Awaited<ReturnType<typeof getCurrentResourceQuotaCalibration>>,
    Awaited<ReturnType<typeof readCalibrationCandidate>>,
  ];

  const byProvider = new Map(snapshots.map((s) => [s.provider, s]));

  const pick = <T>(
    provider: UsageProvider,
  ): { data: T; syncedAt: string } | null => {
    const snap = byProvider.get(provider);
    if (!snap) return null;
    return {
      data: snap.data as T,
      syncedAt: new Date(snap.syncedAt).toISOString(),
    };
  };

  const rawMongo = pick<Record<string, unknown>>("mongodb");
  const mongodb = rawMongo
    ? {
        syncedAt: rawMongo.syncedAt,
        data: mongoUsageDataSchema.parse({
          quotaUsedMb: rawMongo.data.quotaUsedMb ?? null,
          quotaLimitMb:
            rawMongo.data.quotaLimitMb ??
            rawMongo.data.storageLimitMb ??
            MONGODB_STORAGE_LIMIT_MB,
          quotaSource: rawMongo.data.quotaSource ?? "unavailable",
          dataSizeMb: rawMongo.data.dataSizeMb ?? null,
          storageSizeMb:
            rawMongo.data.storageSizeMb ?? rawMongo.data.storageUsedMb ?? null,
          indexSizeMb: rawMongo.data.indexSizeMb ?? null,
          connections: rawMongo.data.connections ?? null,
          cpuAvgPercent: rawMongo.data.cpuAvgPercent ?? null,
          collections: rawMongo.data.collections ?? null,
        }),
      }
    : null;
  const cloudinary = pick<CloudinaryUsageData>("cloudinary");
  const rawTenant = pick<TenantUsageSnapshotData>("tenant_usage");
  // Old snapshots have no quality flags. Do not present them as verified data.
  const rawTenantUsage = rawTenant
    ? {
        syncedAt: rawTenant.syncedAt,
        data: tenantUsageSnapshotDataSchema.parse({
          ...rawTenant.data,
          tenants: rawTenant.data.tenants.map((row) => ({
            ...row,
            dbEstimateComplete: row.dbEstimateComplete === true,
            dbEstimateMb:
              row.dbEstimateComplete === true ? row.dbEstimateMb : null,
            mediaComplete: row.mediaComplete === true,
            mediaMb: row.mediaComplete === true ? row.mediaMb : null,
            mediaAssets:
              row.mediaComplete === true ? (row.mediaAssets ?? null) : null,
          })),
          totalDbEstimateMb: rawTenant.data.tenants.every(
            (row) => row.dbEstimateComplete === true,
          )
            ? rawTenant.data.totalDbEstimateMb
            : null,
          totalMediaMb: rawTenant.data.tenants.every(
            (row) => row.mediaComplete === true,
          )
            ? rawTenant.data.totalMediaMb
            : null,
          topByDb: rawTenant.data.tenants.every(
            (row) => row.dbEstimateComplete === true,
          )
            ? rawTenant.data.topByDb
            : null,
          topByMedia: rawTenant.data.tenants.every(
            (row) => row.mediaComplete === true,
          )
            ? rawTenant.data.topByMedia
            : null,
        }),
      }
    : null;
  const baseline = calibration
    ? { mongoMb: calibration.mongoMb, cloudinaryMb: calibration.cloudinaryMb }
    : null;

  let tenantUsage: { data: TenantUsageData; syncedAt: string } | null = null;
  if (rawTenantUsage) {
    const planByTenantId = await resolveEffectivePlansForTenants(
      rawTenantUsage.data.tenants.map((row) => row.tenantId),
    );

    tenantUsage = {
      syncedAt: rawTenantUsage.syncedAt,
      data: {
        ...rawTenantUsage.data,
        tenants: rawTenantUsage.data.tenants.map((row) => {
          const plan = planByTenantId.get(row.tenantId) ?? "maria";
          const quotas = getPlanResourceQuota(plan);
          const usage = buildTenantResourceUsage({
            plan,
            mongoUsageMb: row.dbEstimateMb,
            mongoComplete: row.dbEstimateComplete,
            cloudinaryUsageMb: row.mediaMb,
            cloudinaryComplete: row.mediaComplete,
            cloudinaryAssets: row.mediaAssets,
            updatedAt: rawTenantUsage.syncedAt,
          });
          return {
            ...row,
            plan,
            quotas,
            mongoPercent: usage.mongo.percent,
            cloudinaryPercent: usage.cloudinary.percent,
            mongoStatus: usage.mongo.status,
            cloudinaryStatus: usage.cloudinary.status,
            status: usage.status,
          };
        }),
      },
    };
  }

  const capacity = calculatePlatformEquivalentCapacity({
    baseline,
    mongoQuotaUsedMb:
      mongodb?.data.quotaSource === "atlasSize"
        ? mongodb.data.quotaUsedMb
        : null,
    mongoStorageLimitMb: mongodb?.data.quotaLimitMb ?? null,
    cloudinaryStorageUsedMb: cloudinary?.data.storageUsedMb ?? null,
    cloudinaryStorageLimitGb: cloudinary?.data.storageLimitGb ?? null,
  });

  return {
    mongodb,
    cloudinary,
    tenantUsage,
    calibration,
    calibrationCandidate,
    capacity,
    capture: null,
  };
}
