import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface EmailCampaignPerformance {
  campaignId: string;

  subjectLine: string;
  topic?: string;

  sentCount: number;
  deliveredCount: number;

  openCount: number;
  clickCount: number;

  openRate: number;
  clickRate: number;

  createdAt: Date;
}

export interface CampaignAnalyticsDocument extends Document {
  tenantId: Types.ObjectId;
  salonProfileId: Types.ObjectId;

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
    campaignId: {
      type: String,
      required: true,
    },

    subjectLine: {
      type: String,
      required: true,
    },

    topic: {
      type: String,
      default: "",
    },

    sentCount: {
      type: Number,
      default: 0,
    },

    deliveredCount: {
      type: Number,
      default: 0,
    },

    openCount: {
      type: Number,
      default: 0,
    },

    clickCount: {
      type: Number,
      default: 0,
    },

    openRate: {
      type: Number,
      default: 0,
    },

    clickRate: {
      type: Number,
      default: 0,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const CampaignAnalyticsSchema = new Schema<CampaignAnalyticsDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    salonProfileId: {
      type: Schema.Types.ObjectId,
      ref: "SalonProfile",
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

    bestSubjectLines: {
      type: [String],
      default: [],
    },

    worstSubjectLines: {
      type: [String],
      default: [],
    },

    topTopics: {
      type: [String],
      default: [],
    },

    campaignHistory: {
      type: [CampaignPerformanceSchema],
      default: [],
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

/**
 * Compound index:
 * jedan analytics dokument po salonu
 */
CampaignAnalyticsSchema.index(
  { tenantId: 1, salonProfileId: 1 },
  { unique: true },
);

export const CampaignAnalytics: Model<CampaignAnalyticsDocument> =
  mongoose.models.CampaignAnalytics ||
  mongoose.model<CampaignAnalyticsDocument>(
    "CampaignAnalytics",
    CampaignAnalyticsSchema,
  );
