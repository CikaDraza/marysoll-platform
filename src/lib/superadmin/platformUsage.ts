/**
 * lib/superadmin/platformUsage.ts
 *
 * SERVER-ONLY — nikad ne importovati u Client Components ili hooks!
 *
 * Sakuplja infrastrukturnu potrošnju platforme (MongoDB + Cloudinary) i procenu
 * po tenantu. Spoljni pozivi (Cloudinary Admin API, db admin komande) se rade SAMO
 * u `refreshPlatformUsage()` — dashboard čita keširani `PlatformUsageSnapshot`.
 */
import "server-only";

import { cloudinary } from "@/lib/cloudinary";
import { connectToDB } from "@/lib/db/mongodb";
import {
  PlatformUsageSnapshot,
  type UsageProvider,
} from "@/models/PlatformUsageSnapshot";
import { Tenant } from "@/models/Tenant";
import {
  getCurrentResourceQuotaCalibration,
  readCalibrationCandidate,
} from "@/lib/superadmin/resourceQuotaCalibration";
import {
  buildTenantResourceUsage,
  calculatePlatformEquivalentCapacity,
  getPlanResourceQuota,
} from "@/lib/plans/resourceQuotas";
import type { PlanName } from "@/lib/plans/planFeatures";
import type {
  CloudinaryUsageData,
  MongoUsageData,
  PlatformUsageRead,
  TenantUsageData,
  TenantUsageSnapshotData,
  TenantUsageSnapshotRow,
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
import type { Model } from "mongoose";

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

  const stats = (await db.stats()) as {
    storageSize?: number;
    collections?: number;
  };

  let connections: number | null = null;
  try {
    // serverStatus može biti ograničen na shared tierovima — fallback na null.
    const serverStatus = (await db.admin().serverStatus()) as {
      connections?: { current?: number };
    };
    connections = serverStatus.connections?.current ?? null;
  } catch {
    connections = null;
  }

  return {
    storageUsedMb: toMb(stats.storageSize ?? 0),
    storageLimitMb: MONGODB_STORAGE_LIMIT_MB,
    connections,
    // CPU je HARDKODOVAN `null`, i to je razlog zašto se nikad ne prikazuje —
    // ne zbog isteklih kredencijala. `storageUsedMb` i `connections` iznad
    // dolaze iz obične konekcije (`db.stats()` / `serverStatus()`), pa metrika
    // potrošnje ne zavisi ni od kakvog Atlas ključa.
    //
    // Za CPU trebaju DVE stvari, i nijedna nije samo ključ:
    //   1. poziv ka Atlas Admin API-ju (autentifikacija Service Account-om —
    //      tek tada bi MONGODB_ATLAS_CLIENT_ID/SECRET prvi put nešto radili)
    //   2. klaster M10+ — M0 free tier NE izlaže hardverske metrike, pa bi na
    //      njemu i ispravni ključevi vratili prazno
    //
    // Očekivani trenutak: prelazak na M10 kad broj tenanta preraste free tier
    // (procena ~20+), kada ionako trebaju jači procesor i više storage-a.
    cpuAvgPercent: null,
    collections: stats.collections ?? 0,
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

  const storageBytes = usage.storage?.usage ?? 0;
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

// ─── Cloudinary media po tenantu ─────────────────────────────────────────────
async function getTenantMediaBytes(
  folder: string,
): Promise<{ bytes: number; assets: number }> {
  let bytes = 0;
  let assets = 0;
  let nextCursor: string | undefined;
  let guard = 0; // sprečava beskonačnu petlju

  // Admin API `prefix` filtrira po public_id prefiksu — pouzdano hvata sve
  // (uključujući ugnežđene podfoldere) za zadati cloudinaryFolder.
  do {
    const res = (await cloudinary.api.resources({
      type: "upload",
      prefix: folder,
      max_results: 500,
      next_cursor: nextCursor,
    })) as {
      resources?: { bytes?: number }[];
      next_cursor?: string;
    };

    const resources = res.resources ?? [];
    for (const r of resources) bytes += r.bytes ?? 0;
    assets += resources.length;
    nextCursor = res.next_cursor;
    guard += 1;
  } while (nextCursor && guard < 20);

  return { bytes, assets };
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

  // Laka procena: count(docs po tenantId) × avgObjSize (iz collStats).
  for (const Model of TENANT_SCOPED_MODELS) {
    const collName = Model.collection.collectionName;
    let avgObjSize = 0;
    try {
      const collStats = (await db.command({ collStats: collName })) as {
        avgObjSize?: number;
      };
      avgObjSize = collStats.avgObjSize ?? 0;
    } catch {
      continue; // kolekcija još ne postoji
    }
    if (avgObjSize <= 0) continue;

    const counts = (await Model.aggregate([
      { $group: { _id: "$tenantId", count: { $sum: 1 } } },
    ])) as { _id: { toString(): string } | null; count: number }[];

    for (const c of counts) {
      if (!c._id) continue;
      const key = c._id.toString();
      dbBytesByTenant.set(
        key,
        (dbBytesByTenant.get(key) ?? 0) + c.count * avgObjSize,
      );
    }
  }

  const rows: TenantUsageSnapshotRow[] = [];
  for (const t of tenants) {
    const id = t._id.toString();
    const dbBytes = dbBytesByTenant.get(id) ?? 0;
    let mediaBytes = 0;
    if (t.cloudinaryFolder) {
      try {
        const media = await getTenantMediaBytes(t.cloudinaryFolder);
        mediaBytes = media.bytes;
      } catch {
        mediaBytes = 0;
      }
    }
    rows.push({
      tenantId: id,
      name: t.name,
      slug: t.slug,
      dbEstimateMb: toMbPrecise(dbBytes),
      mediaMb: toMbPrecise(mediaBytes),
    });
  }

  rows.sort(
    (a, b) => b.mediaMb + b.dbEstimateMb - (a.mediaMb + a.dbEstimateMb),
  );

  const totalDbEstimateMb =
    Math.round(rows.reduce((s, r) => s + r.dbEstimateMb, 0) * 1000) / 1000;
  const totalMediaMb =
    Math.round(rows.reduce((s, r) => s + r.mediaMb, 0) * 1000) / 1000;

  const topByDb = [...rows].sort((a, b) => b.dbEstimateMb - a.dbEstimateMb)[0];
  const topByMedia = [...rows].sort((a, b) => b.mediaMb - a.mediaMb)[0];

  return {
    tenants: rows,
    totalDbEstimateMb,
    totalMediaMb,
    topByDb: topByDb
      ? { name: topByDb.name, dbEstimateMb: topByDb.dbEstimateMb }
      : null,
    topByMedia: topByMedia
      ? { name: topByMedia.name, mediaMb: topByMedia.mediaMb }
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

export async function refreshPlatformUsage(): Promise<PlatformUsageRead> {
  await connectToDB();

  const [mongoRes, cloudinaryRes, tenantRes] = await Promise.allSettled([
    getMongoUsage(),
    getCloudinaryUsage(),
    getTenantUsage(),
  ]);

  // Logovanje pojedinačnih grešaka (allSettled ih inače proguta).
  for (const [name, res] of [
    ["mongodb", mongoRes],
    ["cloudinary", cloudinaryRes],
    ["tenant_usage", tenantRes],
  ] as const) {
    if (res.status === "rejected") {
      console.error(`refreshPlatformUsage: ${name} failed:`, res.reason);
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
    // Usput popuni per-tenant storageMetrics (koristi sledeći task: tenant dashboard).
    const now = new Date();
    await Promise.all(
      tenantRes.value.tenants.map((row) =>
        Tenant.updateOne(
          { _id: row.tenantId },
          {
            $set: {
              "storageMetrics.mongoUsageMb": row.dbEstimateMb,
              "storageMetrics.cloudinaryUsageMb": row.mediaMb,
              "storageMetrics.updatedAt": now,
            },
          },
        ),
      ),
    );
  }

  return readPlatformUsage();
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

  const mongodb = pick<MongoUsageData>("mongodb");
  const cloudinary = pick<CloudinaryUsageData>("cloudinary");
  const rawTenantUsage = pick<TenantUsageSnapshotData>("tenant_usage");
  const baseline = calibration
    ? { mongoMb: calibration.mongoMb, cloudinaryMb: calibration.cloudinaryMb }
    : null;

  let tenantUsage: { data: TenantUsageData; syncedAt: string } | null = null;
  if (rawTenantUsage) {
    const tenantIds = rawTenantUsage.data.tenants.map((row) => row.tenantId);
    const tenants = await Tenant.find({ _id: { $in: tenantIds } })
      .select("_id plan")
      .lean<Array<{ _id: { toString(): string }; plan?: PlanName }>>();
    const planByTenantId = new Map(
      tenants.map((tenant) => [tenant._id.toString(), tenant.plan ?? "maria"]),
    );

    tenantUsage = {
      syncedAt: rawTenantUsage.syncedAt,
      data: {
        ...rawTenantUsage.data,
        tenants: rawTenantUsage.data.tenants.map((row) => {
          const plan = planByTenantId.get(row.tenantId) ?? "maria";
          const quotas = getPlanResourceQuota(plan, baseline);
          const usage = buildTenantResourceUsage({
            plan,
            mongoUsageMb: row.dbEstimateMb,
            cloudinaryUsageMb: row.mediaMb,
            updatedAt: rawTenantUsage.syncedAt,
            baseline,
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
    mongoStorageUsedMb: mongodb?.data.storageUsedMb ?? null,
    mongoStorageLimitMb: mongodb?.data.storageLimitMb ?? null,
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
  };
}
