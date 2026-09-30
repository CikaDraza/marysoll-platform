import { z } from "zod";
import {
  planNameSchema,
  platformEquivalentCapacitySchema,
  resourceQuotaCalibrationReadSchema,
  resourceQuotaStatusSchema,
  resourceQuotasSchema,
} from "@/types/resource-quota";

export const mongoUsageDataSchema = z.object({
  storageUsedMb: z.number().finite().nonnegative(),
  storageLimitMb: z.number().finite().nonnegative(),
  connections: z.number().int().nonnegative().nullable(),
  cpuAvgPercent: z.number().finite().nonnegative().nullable(),
  collections: z.number().int().nonnegative(),
});

export const cloudinaryUsageDataSchema = z.object({
  storageUsedMb: z.number().finite().nonnegative(),
  storageLimitGb: z.number().finite().nonnegative(),
  assets: z.number().int().nonnegative(),
  bandwidthGb: z.number().finite().nonnegative(),
  transformations: z.number().int().nonnegative(),
  requests: z.number().int().nonnegative().nullable(),
});

export const tenantUsageSnapshotRowSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string(),
  slug: z.string().min(1),
  dbEstimateMb: z.number().finite().nonnegative(),
  mediaMb: z.number().finite().nonnegative(),
});

const tenantUsageSnapshotDataBaseSchema = z.object({
  totalDbEstimateMb: z.number().finite().nonnegative(),
  totalMediaMb: z.number().finite().nonnegative(),
  topByDb: z
    .object({
      name: z.string(),
      dbEstimateMb: z.number().finite().nonnegative(),
    })
    .nullable(),
  topByMedia: z
    .object({ name: z.string(), mediaMb: z.number().finite().nonnegative() })
    .nullable(),
});

export const tenantUsageSnapshotDataSchema =
  tenantUsageSnapshotDataBaseSchema.extend({
    tenants: z.array(tenantUsageSnapshotRowSchema),
  });

export const tenantUsageRowSchema = tenantUsageSnapshotRowSchema.extend({
  plan: planNameSchema,
  quotas: resourceQuotasSchema,
  mongoPercent: z.number().finite().nonnegative().nullable(),
  cloudinaryPercent: z.number().finite().nonnegative().nullable(),
  mongoStatus: resourceQuotaStatusSchema.nullable(),
  cloudinaryStatus: resourceQuotaStatusSchema.nullable(),
  status: resourceQuotaStatusSchema.nullable(),
});

export const tenantUsageDataSchema = tenantUsageSnapshotDataBaseSchema.extend({
  tenants: z.array(tenantUsageRowSchema),
});

export const calibrationCandidateSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string(),
  slug: z.string().min(1),
  mongoMb: z.number().finite().nonnegative(),
  cloudinaryMb: z.number().finite().nonnegative(),
  snapshotSyncedAt: z.iso.datetime(),
});

function snapshotSchema<T extends z.ZodType>(data: T) {
  return z.object({ data, syncedAt: z.iso.datetime() }).nullable();
}

export const platformUsageReadSchema = z.object({
  mongodb: snapshotSchema(mongoUsageDataSchema),
  cloudinary: snapshotSchema(cloudinaryUsageDataSchema),
  tenantUsage: snapshotSchema(tenantUsageDataSchema),
  calibration: resourceQuotaCalibrationReadSchema.nullable(),
  calibrationCandidate: calibrationCandidateSchema.nullable(),
  capacity: platformEquivalentCapacitySchema,
});

export const platformUsageResponseSchema = z.object({
  success: z.literal(true),
  usage: platformUsageReadSchema,
});

export const apiErrorResponseSchema = z.object({
  error: z.string().min(1),
});

export type MongoUsageData = z.infer<typeof mongoUsageDataSchema>;
export type CloudinaryUsageData = z.infer<typeof cloudinaryUsageDataSchema>;
export type TenantUsageSnapshotRow = z.infer<
  typeof tenantUsageSnapshotRowSchema
>;
export type TenantUsageSnapshotData = z.infer<
  typeof tenantUsageSnapshotDataSchema
>;
export type TenantUsageRow = z.infer<typeof tenantUsageRowSchema>;
export type TenantUsageData = z.infer<typeof tenantUsageDataSchema>;
export type CalibrationCandidate = z.infer<typeof calibrationCandidateSchema>;
export type PlatformUsageRead = z.infer<typeof platformUsageReadSchema>;
export type PlatformUsageResponse = z.infer<typeof platformUsageResponseSchema>;
