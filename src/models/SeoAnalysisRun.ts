import { Schema, model, models } from "mongoose";

const SeoAnalysisRunSchema = new Schema(
  {
    scope: { type: String, required: true, index: true },
    page: { type: String, required: true, index: true },
    crawlUrl: { type: String, default: null },
    crawlError: { type: String, default: null },
    snapshot: { type: Schema.Types.Mixed, required: true },
    performance: { type: Schema.Types.Mixed, default: null },
    result: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const SeoAnalysisRun =
  models.SeoAnalysisRun || model("SeoAnalysisRun", SeoAnalysisRunSchema);
