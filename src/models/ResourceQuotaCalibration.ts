import { Schema, model, models, type Document, type Types } from "mongoose";

export interface IResourceQuotaCalibration extends Document {
  sourceTenantId: Types.ObjectId;
  sourceTenantName: string;
  sourceTenantSlug: string;
  mongoMb: number;
  cloudinaryMb: number;
  sourceSnapshotSyncedAt: Date;
  capturedAt: Date;
  capturedBy: Types.ObjectId;
}

const ResourceQuotaCalibrationSchema = new Schema<IResourceQuotaCalibration>(
  {
    sourceTenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      immutable: true,
    },
    sourceTenantName: { type: String, required: true, immutable: true },
    sourceTenantSlug: { type: String, required: true, immutable: true },
    mongoMb: { type: Number, required: true, min: 0, immutable: true },
    cloudinaryMb: { type: Number, required: true, min: 0, immutable: true },
    sourceSnapshotSyncedAt: { type: Date, required: true, immutable: true },
    capturedAt: {
      type: Date,
      required: true,
      default: Date.now,
      immutable: true,
    },
    capturedBy: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
      immutable: true,
    },
  },
  { timestamps: true },
);

ResourceQuotaCalibrationSchema.index({ capturedAt: -1 });

export const ResourceQuotaCalibration =
  models.ResourceQuotaCalibration ||
  model<IResourceQuotaCalibration>(
    "ResourceQuotaCalibration",
    ResourceQuotaCalibrationSchema,
  );
