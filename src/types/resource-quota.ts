import { z } from "zod";

export const planNameSchema = z.enum([
  "maria",
  "claudia",
  "kiki",
  "enterprise",
]);

export const resourceQuotaStatusSchema = z.enum([
  "healthy",
  "warning",
  "limit_reached",
]);

export const resourceQuotaBaselineSchema = z.object({
  mongoMb: z.number().finite().nonnegative(),
  cloudinaryMb: z.number().finite().nonnegative(),
});

export const resourceQuotasSchema = z.object({
  mongoStorageMb: z.number().finite().nonnegative().nullable(),
  cloudinaryStorageMb: z.number().finite().nonnegative().nullable(),
});

export const resourceMetricUsageSchema = z.object({
  usedMb: z.number().finite().nonnegative(),
  quotaMb: z.number().finite().nonnegative().nullable(),
  percent: z.number().finite().nonnegative().nullable(),
  status: resourceQuotaStatusSchema.nullable(),
  isEstimate: z.boolean(),
});

export const tenantResourceUsageSchema = z.object({
  plan: planNameSchema,
  mongo: resourceMetricUsageSchema,
  cloudinary: resourceMetricUsageSchema,
  status: resourceQuotaStatusSchema.nullable(),
  nextPlan: planNameSchema.nullable(),
  updatedAt: z.iso.datetime(),
});

export const resourceQuotaCalibrationReadSchema =
  resourceQuotaBaselineSchema.extend({
    id: z.string().min(1),
    sourceTenantId: z.string().min(1),
    sourceTenantName: z.string(),
    sourceTenantSlug: z.string().min(1),
    sourceSnapshotSyncedAt: z.iso.datetime(),
    capturedAt: z.iso.datetime(),
  });

export const platformEquivalentCapacitySchema = z.object({
  safeCapacityRatio: z.number().finite().positive().max(1),
  mongoSafeCapacityMb: z.number().finite().nonnegative().nullable(),
  cloudinarySafeCapacityMb: z.number().finite().nonnegative().nullable(),
  mongoAnjaEquivalentCapacity: z.number().int().nonnegative().nullable(),
  cloudinaryAnjaEquivalentCapacity: z.number().int().nonnegative().nullable(),
  platformAnjaEquivalentCapacity: z.number().int().nonnegative().nullable(),
  mongoCurrentAnjaEquivalents: z.number().finite().nonnegative().nullable(),
  cloudinaryCurrentAnjaEquivalents: z
    .number()
    .finite()
    .nonnegative()
    .nullable(),
  currentPlatformAnjaEquivalents: z.number().finite().nonnegative().nullable(),
  bottleneck: z.enum(["mongodb", "cloudinary"]).nullable(),
});

export type PlanName = z.infer<typeof planNameSchema>;
export type ResourceQuotaStatus = z.infer<typeof resourceQuotaStatusSchema>;
export type ResourceQuotaBaseline = z.infer<typeof resourceQuotaBaselineSchema>;
export type ResourceQuotas = z.infer<typeof resourceQuotasSchema>;
export type ResourceMetricUsage = z.infer<typeof resourceMetricUsageSchema>;
export type TenantResourceUsage = z.infer<typeof tenantResourceUsageSchema>;
export type ResourceQuotaCalibrationRead = z.infer<
  typeof resourceQuotaCalibrationReadSchema
>;
export type PlatformEquivalentCapacity = z.infer<
  typeof platformEquivalentCapacitySchema
>;
