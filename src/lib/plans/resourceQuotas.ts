import type { PlanName } from "@/lib/plans/planFeatures";
import type {
  PlatformEquivalentCapacity,
  ResourceMetricUsage,
  ResourceQuotaBaseline,
  ResourceQuotaStatus,
  ResourceQuotas,
  TenantResourceUsage,
} from "@/types/resource-quota";

export const SAFE_CAPACITY_RATIO = 0.8;

// Provisional tenant Mongo estimates. Soft commercial policy, never a write gate.
const MONGO_SOFT_QUOTAS_MB: Record<PlanName, number | null> = {
  maria: 3,
  claudia: 6,
  kiki: 12,
  enterprise: null,
};

const STATUS_RANK: Record<ResourceQuotaStatus, number> = {
  healthy: 0,
  warning: 1,
  limit_reached: 2,
};

function divideOrNull(numerator: number, denominator: number): number | null {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null;
  }
  return numerator / denominator;
}

export function getPlanResourceQuota(plan: PlanName): ResourceQuotas {
  return {
    mongoStorageMb: MONGO_SOFT_QUOTAS_MB[plan],
    // Cloudinary is measurement-only until a business quota is approved.
    cloudinaryStorageMb: null,
  };
}

export function getResourceUsagePercent(
  usedMb: number | null,
  quotaMb: number | null,
): number | null {
  if (
    usedMb == null ||
    quotaMb == null ||
    quotaMb <= 0 ||
    !Number.isFinite(usedMb)
  )
    return null;
  return (Math.max(0, usedMb) / quotaMb) * 100;
}

export function getResourceQuotaStatus(
  percent: number | null,
): ResourceQuotaStatus | null {
  if (percent == null || !Number.isFinite(percent)) return null;
  if (percent >= 100) return "limit_reached";
  if (percent >= 80) return "warning";
  return "healthy";
}

function metricUsage(
  usedMb: number | null,
  complete: boolean,
  quotaMb: number | null,
  isEstimate: boolean,
): ResourceMetricUsage {
  const valid =
    complete && usedMb != null && Number.isFinite(usedMb) && usedMb >= 0;
  const value = valid ? usedMb : null;
  const percent =
    value == null ? null : getResourceUsagePercent(value, quotaMb);
  return {
    usedMb: value,
    complete: valid,
    quotaMb,
    percent,
    status: getResourceQuotaStatus(percent),
    isEstimate,
  };
}

function overallStatus(
  statuses: Array<ResourceQuotaStatus | null>,
): ResourceQuotaStatus | null {
  const available = statuses.filter(
    (status): status is ResourceQuotaStatus => status != null,
  );
  if (available.length === 0) return null;
  return available.reduce((worst, current) =>
    STATUS_RANK[current] > STATUS_RANK[worst] ? current : worst,
  );
}

export function buildTenantResourceUsage(input: {
  plan: PlanName;
  mongoUsageMb: number | null;
  mongoComplete: boolean;
  cloudinaryUsageMb: number | null;
  cloudinaryComplete: boolean;
  cloudinaryAssets: number | null;
  updatedAt: string;
}): TenantResourceUsage {
  const quotas = getPlanResourceQuota(input.plan);
  const mongo = metricUsage(
    input.mongoUsageMb,
    input.mongoComplete,
    quotas.mongoStorageMb,
    true,
  );
  const cloudinary = metricUsage(
    input.cloudinaryUsageMb,
    input.cloudinaryComplete,
    null,
    false,
  );
  const status = overallStatus([mongo.status]);

  return {
    plan: input.plan,
    mongo,
    cloudinary,
    cloudinaryAssets: input.cloudinaryComplete ? input.cloudinaryAssets : null,
    status,
    nextPlan:
      status === "limit_reached" && input.plan === "claudia" ? "kiki" : null,
    updatedAt: input.updatedAt,
  };
}

export function calculatePlatformEquivalentCapacity(input: {
  baseline: ResourceQuotaBaseline | null;
  mongoQuotaUsedMb: number | null;
  mongoStorageLimitMb: number | null;
  cloudinaryStorageUsedMb: number | null;
  cloudinaryStorageLimitGb: number | null;
  safeCapacityRatio?: number;
}): PlatformEquivalentCapacity {
  const safeCapacityRatio = input.safeCapacityRatio ?? SAFE_CAPACITY_RATIO;
  const mongoBaseline = input.baseline?.mongoMb ?? 0;
  const cloudinaryBaseline = input.baseline?.cloudinaryMb ?? 0;
  const mongoLimit = input.mongoStorageLimitMb;
  const cloudinaryLimitMb =
    input.cloudinaryStorageLimitGb == null
      ? null
      : input.cloudinaryStorageLimitGb * 1024;

  const mongoSafeCapacityMb =
    mongoLimit != null && mongoLimit > 0
      ? mongoLimit * safeCapacityRatio
      : null;
  const cloudinarySafeCapacityMb =
    cloudinaryLimitMb != null && cloudinaryLimitMb > 0
      ? cloudinaryLimitMb * safeCapacityRatio
      : null;
  const mongoCapacity =
    mongoSafeCapacityMb == null
      ? null
      : divideOrNull(mongoSafeCapacityMb, mongoBaseline);
  const cloudinaryCapacity =
    cloudinarySafeCapacityMb == null
      ? null
      : divideOrNull(cloudinarySafeCapacityMb, cloudinaryBaseline);
  const mongoEquivalent =
    input.mongoQuotaUsedMb == null
      ? null
      : divideOrNull(input.mongoQuotaUsedMb, mongoBaseline);
  const cloudinaryEquivalent =
    input.cloudinaryStorageUsedMb == null
      ? null
      : divideOrNull(input.cloudinaryStorageUsedMb, cloudinaryBaseline);

  const flooredMongo = mongoCapacity == null ? null : Math.floor(mongoCapacity);
  const flooredCloudinary =
    cloudinaryCapacity == null ? null : Math.floor(cloudinaryCapacity);
  const bothCapacitiesAvailable =
    flooredMongo != null && flooredCloudinary != null;
  const platformCapacity = bothCapacitiesAvailable
    ? Math.min(flooredMongo, flooredCloudinary)
    : null;
  const bottleneck =
    !bothCapacitiesAvailable || flooredMongo === flooredCloudinary
      ? null
      : flooredMongo < flooredCloudinary
        ? "mongodb"
        : "cloudinary";
  const equivalents = [mongoEquivalent, cloudinaryEquivalent].filter(
    (value): value is number => value != null,
  );

  return {
    safeCapacityRatio,
    mongoSafeCapacityMb,
    cloudinarySafeCapacityMb,
    mongoAnjaEquivalentCapacity: flooredMongo,
    cloudinaryAnjaEquivalentCapacity: flooredCloudinary,
    platformAnjaEquivalentCapacity: platformCapacity,
    mongoCurrentAnjaEquivalents: mongoEquivalent,
    cloudinaryCurrentAnjaEquivalents: cloudinaryEquivalent,
    currentPlatformAnjaEquivalents:
      equivalents.length > 0 ? Math.max(...equivalents) : null,
    bottleneck,
  };
}
