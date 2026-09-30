/**
 * TenantUsageHistory — append-only istorija potrošnje po tenantu.
 *
 * `PlatformUsageSnapshot` je latest cache (jedan dokument po provideru, svaki
 * refresh ga pregazi). Ova kolekcija dobija po jedan red za svaki tenant pri
 * svakom refresh-u (ručnom ili cron), pa mesečni rast može da se izračuna kao
 * razlika dva snimka. Redovi se nikad ne menjaju.
 */
import { Schema, model, models, type Document, type Types } from "mongoose";
import type { PlanName } from "@/lib/plans/planFeatures";

export type UsageCaptureSource = "manual" | "cron";

export interface ITenantUsageHistory extends Document {
  captureId: Types.ObjectId;
  tenantId: Types.ObjectId;
  capturedAt: Date;
  source: UsageCaptureSource;
  /** Efektivni plan u trenutku snimka (resolveEffectivePlan). */
  plan: PlanName;
  mongoEstimateMb: number | null;
  mongoEstimateComplete: boolean;
  cloudinaryMb: number | null;
  cloudinaryComplete: boolean;
  cloudinaryAssets: number | null;
  /** Aktivni OWNER/ADMIN/STAFF nalozi u trenutku snimka. */
  activeStaffCount: number;
}

const TenantUsageHistorySchema = new Schema<ITenantUsageHistory>(
  {
    captureId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      immutable: true,
    },
    capturedAt: { type: Date, required: true, immutable: true },
    source: {
      type: String,
      enum: ["manual", "cron"],
      required: true,
      immutable: true,
    },
    plan: {
      type: String,
      enum: ["maria", "claudia", "kiki", "enterprise"],
      required: true,
      immutable: true,
    },
    mongoEstimateMb: { type: Number, default: null, min: 0, immutable: true },
    mongoEstimateComplete: { type: Boolean, default: true, immutable: true },
    cloudinaryMb: { type: Number, default: null, min: 0, immutable: true },
    cloudinaryComplete: { type: Boolean, default: true, immutable: true },
    cloudinaryAssets: { type: Number, default: null, min: 0, immutable: true },
    activeStaffCount: {
      type: Number,
      required: true,
      min: 0,
      immutable: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

TenantUsageHistorySchema.index({ tenantId: 1, capturedAt: -1 });
TenantUsageHistorySchema.index({ capturedAt: -1 });

export const TenantUsageHistory =
  models.TenantUsageHistory ||
  model<ITenantUsageHistory>("TenantUsageHistory", TenantUsageHistorySchema);
