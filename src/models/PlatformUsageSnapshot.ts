/**
 * PlatformUsageSnapshot — cached infrastructure usage for the superadmin dashboard.
 *
 * One document per provider (upsert by `provider`), so we always keep the latest
 * snapshot. The dashboard reads these snapshots; expensive Atlas/Cloudinary calls
 * happen only on an explicit "Osveži potrošnju" (refresh) action.
 */
import { Schema, Document, model, models } from "mongoose";

export type UsageProvider = "mongodb" | "cloudinary" | "tenant_usage";

interface IPlatformUsageSnapshot extends Document {
  provider: UsageProvider;
  // Provider-specific payload — shape is owned by src/lib/superadmin/platformUsage.ts
  data: Record<string, unknown>;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformUsageSnapshotSchema = new Schema<IPlatformUsageSnapshot>(
  {
    provider: {
      type: String,
      enum: ["mongodb", "cloudinary", "tenant_usage"],
      required: true,
      unique: true,
    },
    data: { type: Schema.Types.Mixed, default: {} },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const PlatformUsageSnapshot =
  models.PlatformUsageSnapshot ||
  model<IPlatformUsageSnapshot>(
    "PlatformUsageSnapshot",
    PlatformUsageSnapshotSchema,
  );
