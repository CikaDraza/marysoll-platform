import { Schema, model, models } from "mongoose";

const NewsletterLogSchema = new Schema(
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
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "NewsletterCampaign",
      required: true,
    },
    recipientEmail: { type: String, required: true },
    recipientProfileId: { type: Schema.Types.ObjectId, ref: "TenantUser" },
    status: {
      type: String,
      enum: [
        "sent",
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "complained",
        "unsubscribed",
      ],
      default: "sent",
    },
    sentAt: { type: Date, default: Date.now },
    openedAt: Date,
    clickedAt: Date,
    trackingPixelId: String,
    clickTrackingId: String,
    clickedUrl: String,
  },
  { timestamps: true },
);

export const NewsletterLog =
  models.NewsletterLog || model("NewsletterLog", NewsletterLogSchema);
