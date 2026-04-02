import mongoose, { Schema, Document, Model } from "mongoose";

export interface EmailCampaignPerformance {
  campaignId: string;
  subjectLine: string;
  topic: string;

  sentCount: number;
  deliveredCount: number;
  openCount: number;
  clickCount: number;

  openRate: number;
  clickRate: number;

  createdAt: Date;
}

export interface CampaignAnalyticsDocument extends Document {
  tenantId: string;

  totalCampaigns: number;

  avgOpenRate: number;
  avgClickRate: number;

  bestSubjectLines: string[];
  worstSubjectLines: string[];

  topTopics: string[];

  campaignHistory: EmailCampaignPerformance[];

  lastUpdated: Date;
}

const CampaignPerformanceSchema = new Schema<EmailCampaignPerformance>(
  {
    campaignId: { type: String, required: true },

    subjectLine: { type: String, required: true },
    topic: { type: String },

    sentCount: Number,
    deliveredCount: Number,

    openCount: Number,
    clickCount: Number,

    openRate: Number,
    clickRate: Number,

    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const CampaignAnalyticsSchema = new Schema<CampaignAnalyticsDocument>({
  tenantId: {
    type: String,
    required: true,
    index: true,
  },

  totalCampaigns: {
    type: Number,
    default: 0,
  },

  avgOpenRate: {
    type: Number,
    default: 0,
  },

  avgClickRate: {
    type: Number,
    default: 0,
  },

  bestSubjectLines: [String],
  worstSubjectLines: [String],

  topTopics: [String],

  campaignHistory: [CampaignPerformanceSchema],

  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

export const CampaignAnalytics: Model<CampaignAnalyticsDocument> =
  mongoose.models.CampaignAnalytics ||
  mongoose.model<CampaignAnalyticsDocument>(
    "CampaignAnalytics",
    CampaignAnalyticsSchema,
  );
