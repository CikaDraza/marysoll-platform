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

const PLAN_QUOTA_MULTIPLIERS: Record<PlanName, number | null> = {
  maria: 1,
  claudia: 2,
  kiki: 4,
  enterprise: null,
};

const STATUS_RANK: Record<ResourceQuotaStatus, number> = {
  healthy: 0,
  warning: 1,
  limit_reached: 2,
};

function finiteNonNegative(value: number): number | null {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

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

export function getPlanResourceQuota(
  plan: PlanName,
  baseline: ResourceQuotaBaseline | null,
): ResourceQuotas {
  const multiplier = PLAN_QUOTA_MULTIPLIERS[plan];
  if (!baseline || multiplier == null) {
    return { mongoStorageMb: null, cloudinaryStorageMb: null };
  }

  const mongo = finiteNonNegative(baseline.mongoMb);
  const cloudinary = finiteNonNegative(baseline.cloudinaryMb);
  return {
    mongoStorageMb: mongo == null ? null : mongo * multiplier,
    cloudinaryStorageMb: cloudinary == null ? null : cloudinary * multiplier,
  };
}

export function getResourceUsagePercent(
  usedMb: number,
  quotaMb: number | null,
): number | null {
  if (quotaMb == null || quotaMb <= 0 || !Number.isFinite(usedMb)) return null;
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
  usedMb: number,
  quotaMb: number | null,
  isEstimate: boolean,
): ResourceMetricUsage {
  const percent = getResourceUsagePercent(usedMb, quotaMb);
  return {
    usedMb: Math.max(0, usedMb),
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
  mongoUsageMb: number;
  cloudinaryUsageMb: number;
  updatedAt: string;
  baseline: ResourceQuotaBaseline | null;
}): TenantResourceUsage {
  const quotas = getPlanResourceQuota(input.plan, input.baseline);
  const mongo = metricUsage(input.mongoUsageMb, quotas.mongoStorageMb, true);
  const cloudinary = metricUsage(
    input.cloudinaryUsageMb,
    quotas.cloudinaryStorageMb,
    false,
  );
  const status = overallStatus([mongo.status, cloudinary.status]);

  return {
    plan: input.plan,
    mongo,
    cloudinary,
    status,
    nextPlan:
      status === "limit_reached" && input.plan === "claudia" ? "kiki" : null,
    updatedAt: input.updatedAt,
  };
}

export function calculatePlatformEquivalentCapacity(input: {
  baseline: ResourceQuotaBaseline | null;
  mongoStorageUsedMb: number | null;
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
    input.mongoStorageUsedMb == null
      ? null
      : divideOrNull(input.mongoStorageUsedMb, mongoBaseline);
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
