import { model, models, Schema, Types } from "mongoose";

const theme8LandingEventSchema = new Schema(
  {
    tenantId: { type: Types.ObjectId, ref: "Tenant", required: true },
    eventName: { type: String, enum: ["education_dm_clicked"], required: true },
    bannerId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

theme8LandingEventSchema.index({ tenantId: 1, eventName: 1, createdAt: -1 });

export const Theme8LandingEvent =
  models.Theme8LandingEvent || model("Theme8LandingEvent", theme8LandingEventSchema);
