import { Schema, model, models } from "mongoose";

const SeoMetaSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
    },
    homeTitle: { type: String, default: "" },
    homeDescription: { type: String, default: "" },
    uslugeTitle: { type: String, default: "" },
    uslugeDescription: { type: String, default: "" },
    terminiTitle: { type: String, default: "" },
    terminiDescription: { type: String, default: "" },
  },
  { timestamps: true },
);

export const SeoMeta = models.SeoMeta || model("SeoMeta", SeoMetaSchema);
