import "server-only";

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { PlatformUsageSnapshot } from "@/models/PlatformUsageSnapshot";
import { ResourceQuotaCalibration } from "@/models/ResourceQuotaCalibration";
import { Tenant } from "@/models/Tenant";
import type {
  CalibrationCandidate,
  TenantUsageSnapshotData,
} from "@/types/platform-usage";
import type { ResourceQuotaCalibrationRead } from "@/types/resource-quota";

export const CALIBRATION_TENANT_SLUG = "the-lash-room-by-anja";

interface TenantUsageSnapshotDocument {
  data: TenantUsageSnapshotData;
  syncedAt: Date;
}

export class ResourceQuotaCalibrationError extends Error {
  constructor(
    message: string,
    readonly code: "SNAPSHOT_MISSING" | "TENANT_USAGE_MISSING",
  ) {
    super(message);
    this.name = "ResourceQuotaCalibrationError";
  }
}

export function findCalibrationCandidate(
  snapshot: TenantUsageSnapshotDocument | null,
): CalibrationCandidate | null {
  if (!snapshot) return null;
  const tenant = snapshot.data.tenants.find(
    (row) => row.slug === CALIBRATION_TENANT_SLUG,
  );
  if (!tenant) return null;

  return {
    tenantId: tenant.tenantId,
    name: tenant.name,
    slug: tenant.slug,
    mongoMb: tenant.dbEstimateMb,
    cloudinaryMb: tenant.mediaMb,
    snapshotSyncedAt: new Date(snapshot.syncedAt).toISOString(),
  };
}

function presentCalibration(row: {
  _id: { toString(): string };
  sourceTenantId: { toString(): string };
  sourceTenantName: string;
  sourceTenantSlug: string;
  mongoMb: number;
  cloudinaryMb: number;
  sourceSnapshotSyncedAt: Date;
  capturedAt: Date;
}): ResourceQuotaCalibrationRead {
  return {
    id: row._id.toString(),
    sourceTenantId: row.sourceTenantId.toString(),
    sourceTenantName: row.sourceTenantName,
    sourceTenantSlug: row.sourceTenantSlug,
    mongoMb: row.mongoMb,
    cloudinaryMb: row.cloudinaryMb,
    sourceSnapshotSyncedAt: new Date(row.sourceSnapshotSyncedAt).toISOString(),
    capturedAt: new Date(row.capturedAt).toISOString(),
  };
}

export async function readCalibrationCandidate(): Promise<CalibrationCandidate | null> {
  await connectToDB();
  const snapshot = await PlatformUsageSnapshot.findOne({
    provider: "tenant_usage",
  })
    .select("data syncedAt")
    .lean<TenantUsageSnapshotDocument>();
  return findCalibrationCandidate(snapshot);
}

export async function getCurrentResourceQuotaCalibration(): Promise<ResourceQuotaCalibrationRead | null> {
  await connectToDB();
  const row = (await ResourceQuotaCalibration.findOne({})
    .sort({ capturedAt: -1 })
    .lean()) as unknown as Parameters<typeof presentCalibration>[0] | null;
  return row ? presentCalibration(row) : null;
}

export async function captureResourceQuotaCalibration(
  capturedBy: string,
): Promise<ResourceQuotaCalibrationRead> {
  await connectToDB();
  const candidate = await readCalibrationCandidate();
  if (!candidate) {
    const snapshotExists = await PlatformUsageSnapshot.exists({
      provider: "tenant_usage",
    });
    throw new ResourceQuotaCalibrationError(
      snapshotExists
        ? "The Lash Room nije pronađen u poslednjem tenant usage snapshot-u."
        : "Prvo osvežite potrošnju platforme.",
      snapshotExists ? "TENANT_USAGE_MISSING" : "SNAPSHOT_MISSING",
    );
  }

  const tenant = await Tenant.findOne({ slug: CALIBRATION_TENANT_SLUG })
    .select("_id name slug")
    .lean<{ _id: Types.ObjectId; name: string; slug: string }>();
  if (!tenant || tenant._id.toString() !== candidate.tenantId) {
    throw new ResourceQuotaCalibrationError(
      "Canonical The Lash Room tenant nije pronađen.",
      "TENANT_USAGE_MISSING",
    );
  }

  const created = await ResourceQuotaCalibration.create({
    sourceTenantId: tenant._id,
    sourceTenantName: tenant.name,
    sourceTenantSlug: tenant.slug,
    mongoMb: candidate.mongoMb,
    cloudinaryMb: candidate.cloudinaryMb,
    sourceSnapshotSyncedAt: new Date(candidate.snapshotSyncedAt),
    capturedAt: new Date(),
    capturedBy: new Types.ObjectId(capturedBy),
  });

  return presentCalibration(created.toObject());
}
