import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed";

export interface EmailCampaignDocument extends Document {
  tenantId: Types.ObjectId;
  salonProfileId: Types.ObjectId;
  salonName: string;

  // Input fields
  topic: string;
  audience?: string;
  tone: string;

  // AI-generated strategy
  strategy: {
    sendDateSuggestion?: Date;
    keyAngle: string;
    promotionIdea: string;
  };

  // AI-generated content
  content: {
    subject: string;
    previewText: string;
    heroTitle: string;
    heroText: string;
    offerTitle: string;
    offerText: string;
    ctaText: string;
    ctaUrl: string;
  };

  // HTML template
  template: {
    templateId?: string;
    html: string;
  };

  // AI optimization
  optimization: {
    predictedOpenRate: number;
    predictedClickRate: number;
    optimizedSubject: string;
    optimizedPreview: string;
    aiSuggestions: string[];
    confidenceScore: number;
  };

  // A/B test structure
  abTest: {
    enabled: boolean;
    variants: Array<{
      subject: string;
      weight: number;
    }>;
  };

  // Scheduling
  scheduling: {
    status: CampaignStatus;
    sendAt?: Date;
    sentAt?: Date;
  };

  // Delivery metrics (updated by worker after sending)
  metrics: {
    recipients: number;
    opens: number;
    clicks: number;
    openRate: number;
    clickRate: number;
  };
}

const EmailCampaignSchema = new Schema<EmailCampaignDocument>(
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
    salonName: { type: String, required: true },

    topic: { type: String, required: true },
    audience: { type: String },
    tone: { type: String, required: true },

    strategy: {
      sendDateSuggestion: { type: Date },
      keyAngle: { type: String, default: "" },
      promotionIdea: { type: String, default: "" },
    },

    content: {
      subject: { type: String, default: "" },
      previewText: { type: String, default: "" },
      heroTitle: { type: String, default: "" },
      heroText: { type: String, default: "" },
      offerTitle: { type: String, default: "" },
      offerText: { type: String, default: "" },
      ctaText: { type: String, default: "" },
      ctaUrl: { type: String, default: "" },
    },

    template: {
      templateId: { type: String },
      html: { type: String, default: "" },
    },

    optimization: {
      predictedOpenRate: { type: Number, default: 0 },
      predictedClickRate: { type: Number, default: 0 },
      optimizedSubject: { type: String, default: "" },
      optimizedPreview: { type: String, default: "" },
      aiSuggestions: { type: [String], default: [] },
      confidenceScore: { type: Number, default: 0 },
    },

    abTest: {
      enabled: { type: Boolean, default: false },
      variants: {
        type: [
          {
            subject: { type: String, required: true },
            weight: { type: Number, required: true },
          },
        ],
        default: [],
      },
    },

    scheduling: {
      status: {
        type: String,
        enum: ["draft", "scheduled", "sending", "sent", "failed"],
        default: "draft",
      },
      sendAt: { type: Date },
      sentAt: { type: Date },
    },

    metrics: {
      recipients: { type: Number, default: 0 },
      opens: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      openRate: { type: Number, default: 0 },
      clickRate: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

EmailCampaignSchema.index({ tenantId: 1, "scheduling.status": 1 });
EmailCampaignSchema.index({ tenantId: 1, salonProfileId: 1 });

export const EmailCampaign: Model<EmailCampaignDocument> =
  mongoose.models.EmailCampaign ||
  mongoose.model<EmailCampaignDocument>("EmailCampaign", EmailCampaignSchema);
