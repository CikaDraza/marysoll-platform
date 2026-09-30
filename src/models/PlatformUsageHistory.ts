/**
 * PlatformUsageHistory — append-only globalna potrošnja po refresh-u.
 *
 * Jedan red po capture-u (isti `captureId` kao TenantUsageHistory redovi).
 * Čuva stvarni globalni storage i zbir tenant procena iz istog trenutka, da
 * bi se kasnije poredio Δ globalnog Mongo storage-a sa Σ Δ tenant procena
 * (physicalization factor). Provider koji nije uspeo ostaje `null`.
 */
import { Schema, model, models, type Document, type Types } from "mongoose";
import type { UsageCaptureSource } from "@/models/TenantUsageHistory";

export interface IPlatformUsageHistory extends Document {
  captureId: Types.ObjectId;
  capturedAt: Date;
  source: UsageCaptureSource;
  mongoStorageUsedMb: number | null;
  mongoStorageLimitMb: number | null;
  cloudinaryStorageUsedMb: number | null;
  cloudinaryStorageLimitGb: number | null;
  tenantCount: number | null;
  tenantMongoEstimateTotalMb: number | null;
  tenantCloudinaryTotalMb: number | null;
}

const nullableNumber = {
  type: Number,
  default: null,
  min: 0,
  immutable: true,
} as const;

const PlatformUsageHistorySchema = new Schema<IPlatformUsageHistory>(
  {
    captureId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      immutable: true,
    },
    capturedAt: { type: Date, required: true, immutable: true },
    source: {
      type: String,
      enum: ["manual", "cron"],
      required: true,
      immutable: true,
    },
    mongoStorageUsedMb: nullableNumber,
    mongoStorageLimitMb: nullableNumber,
    cloudinaryStorageUsedMb: nullableNumber,
    cloudinaryStorageLimitGb: nullableNumber,
    tenantCount: nullableNumber,
    tenantMongoEstimateTotalMb: nullableNumber,
    tenantCloudinaryTotalMb: nullableNumber,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PlatformUsageHistorySchema.index({ capturedAt: -1 });

export const PlatformUsageHistory =
  models.PlatformUsageHistory ||
  model<IPlatformUsageHistory>(
    "PlatformUsageHistory",
    PlatformUsageHistorySchema,
  );
