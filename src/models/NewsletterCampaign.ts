import { Schema, model, models } from "mongoose";

const NewsletterCampaignSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: false,
    },
    platformOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: false,
    },
    scope: {
      type: String,
      enum: ["tenant", "platform"],
      default: "tenant",
      index: true,
    },
    name: { type: String, required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "NewsletterTemplate" },
    subject: { type: String, required: true },
    content: { type: String, required: true },
    previewText: String,
    manualRecipients: [String],
    sendToAll: { type: Boolean, default: false },
    // Platform-only audience segment. "all" applies no contactType gate.
    audienceFilter: {
      type: String,
      enum: ["all", "leads", "owners"],
      default: "all",
    },
    ctaSlug: { type: String, default: "" },
    excludeRecentSubscribers: { type: Boolean, default: false },
    excludeInactive: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "failed",
        "paused",
        "stopped",
      ],
      default: "draft",
    },
    scheduledFor: Date,
    sentAt: Date,
    sentCount: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    unsubscribeCount: { type: Number, default: 0 },
    bounceCount: { type: Number, default: 0 },
    spamReportCount: { type: Number, default: 0 },
    campaignType: {
      type: String,
      enum: ["email-only", "email-landing"],
      default: "email-only",
    },
    semanticContent: {
      status: {
        type: String,
        enum: ["empty", "draft", "approved", "generated"],
        default: "empty",
      },
      source: {
        type: String,
        enum: ["manual", "ai", "imported"],
        default: "manual",
      },
      intent: { type: String, default: "" },
      summary: { type: String, default: "" },
      keyPoints: [String],
      audience: { type: String, default: "" },
      ctaGoal: { type: String, default: "" },
      keywords: [String],
      tone: {
        type: String,
        enum: ["informative", "friendly", "urgent", "premium"],
        default: "friendly",
      },
      _id: false,
    },
    landingPage: {
      enabled: { type: Boolean, default: false },
      slug: String,
      status: {
        type: String,
        enum: ["pending", "generated", "published", "failed"],
        default: "pending",
      },
      generatedAt: Date,
      regeneratedCount: { type: Number, default: 0 },
      layout: { type: Schema.Types.Mixed, default: [] },
      semanticType: String,
      audience: {
        type: String,
        enum: ["client", "partner"],
        default: "client",
      },
      editorialCategory: { type: String, default: "Beauty" },
      score: { type: Number, default: 0 },
      seo: {
        title: { type: String, default: "" },
        description: { type: String, default: "" },
        keywords: [String],
        ogTitle: { type: String, default: "" },
        ogDescription: { type: String, default: "" },
        ogImage: { type: String, default: "" },
        _id: false,
      },
      _id: false,
    },
  },
  { timestamps: true },
);

export const NewsletterCampaign =
  models.NewsletterCampaign ||
  model("NewsletterCampaign", NewsletterCampaignSchema);
