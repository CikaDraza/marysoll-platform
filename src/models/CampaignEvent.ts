import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type CampaignEventType = "sent" | "open" | "click";

export interface CampaignEventDocument extends Document {
  campaignId: Types.ObjectId;
  tenantId: Types.ObjectId;
  recipientEmail: string;
  recipientUserId?: Types.ObjectId;
  type: CampaignEventType;
  /** A/B variant this recipient received */
  variantId?: "A" | "B";
  /** URL clicked (only for type=click) */
  url?: string;
  timestamp: Date;
}

const CampaignEventSchema = new Schema<CampaignEventDocument>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "EmailCampaign",
      required: true,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    recipientEmail: { type: String, required: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["sent", "open", "click"],
      required: true,
    },
    variantId: { type: String, enum: ["A", "B"] },
    url: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

// Compound index for timeline queries
CampaignEventSchema.index({ campaignId: 1, type: 1, timestamp: 1 });
// Prevent duplicate opens from same user (best-effort)
CampaignEventSchema.index(
  { campaignId: 1, recipientEmail: 1, type: 1 },
  { unique: false },
);

export const CampaignEvent: Model<CampaignEventDocument> =
  mongoose.models.CampaignEvent ||
  mongoose.model<CampaignEventDocument>("CampaignEvent", CampaignEventSchema);
