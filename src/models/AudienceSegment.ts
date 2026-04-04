import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface AudienceSegmentFilters {
  /** Include clients who visited within the last N days */
  lastVisitDays?: number;
  /** Client tags to include */
  tags?: string[];
  /** Only include users with newsletter subscription */
  subscribed?: boolean;
  /** Only include users with specific roles (defaults to CLIENT) */
  roles?: string[];
}

export interface AudienceSegmentDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  filters: AudienceSegmentFilters;
  /** Cached count, updated when segment is previewed/used */
  estimatedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AudienceSegmentSchema = new Schema<AudienceSegmentDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    filters: {
      lastVisitDays: { type: Number },
      tags: { type: [String], default: [] },
      subscribed: { type: Boolean },
      roles: { type: [String], default: ["CLIENT"] },
    },
    estimatedCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

AudienceSegmentSchema.index({ tenantId: 1, name: 1 });

export const AudienceSegment: Model<AudienceSegmentDocument> =
  mongoose.models.AudienceSegment ||
  mongoose.model<AudienceSegmentDocument>(
    "AudienceSegment",
    AudienceSegmentSchema,
  );
