import { Schema, Document, Types, model, models } from "mongoose";
import type { PlanName, PlanFeatures } from "@/lib/plans/planFeatures";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "paused"
  | "expired";

export interface ISubscription extends Document {
  tenantId: Types.ObjectId;
  plan: PlanName;
  status: SubscriptionStatus;

  billingProvider: "internal" | "paddle";

  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;

  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  paddleProductId: string | null;
  paddlePriceId: string | null;
  paddleTransactionId: string | null;

  usage: {
    aiRequestsThisMonth: number;
    aiRequestsResetAt: Date;
    storageUsedGb: number;
    storageUpdatedAt: Date;
  };

  featureOverrides: Partial<PlanFeatures> | null;
  overrideExpiresAt: Date | null;
  overrideNote: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
    },

    plan: {
      type: String,
      enum: ["maria", "claudia", "kiki", "enterprise"] as PlanName[],
      required: true,
      default: "maria",
    },

    status: {
      type: String,
      enum: [
        "trialing",
        "active",
        "past_due",
        "cancelled",
        "paused",
        "expired",
      ] as SubscriptionStatus[],
      required: true,
      default: "trialing",
    },

    billingProvider: {
      type: String,
      enum: ["internal", "paddle"],
      default: "internal",
      required: true,
    },

    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    paddleCustomerId: { type: String, default: null },
    paddleSubscriptionId: { type: String, default: null },
    paddleProductId: { type: String, default: null },
    paddlePriceId: { type: String, default: null },
    paddleTransactionId: { type: String, default: null },

    usage: {
      aiRequestsThisMonth: { type: Number, default: 0 },
      aiRequestsResetAt: { type: Date, default: Date.now },
      storageUsedGb: { type: Number, default: 0 },
      storageUpdatedAt: { type: Date, default: Date.now },
      _id: false,
    },

    featureOverrides: { type: Schema.Types.Mixed, default: null },
    overrideExpiresAt: { type: Date, default: null },
    overrideNote: { type: String, default: null },
  },
  { timestamps: true },
);

// NOTE: tenantId uniqueness is declared via `unique: true` on the field above.
// Do NOT also add SubscriptionSchema.index({ tenantId: 1 }) — that produces a
// "Duplicate schema index" warning.

// paddleSubscriptionId is null for every internal/trial subscription. A plain
// (or even `sparse`) unique index still collides on explicit nulls — `sparse`
// only skips documents where the field is ABSENT, not where it is present and
// null. Use a partial index so uniqueness is enforced only on real Paddle ids.
SubscriptionSchema.index(
  { paddleSubscriptionId: 1 },
  {
    unique: true,
    partialFilterExpression: { paddleSubscriptionId: { $type: "string" } },
  },
);

SubscriptionSchema.index({ status: 1, plan: 1 });
SubscriptionSchema.index({ paddleCustomerId: 1 }, { sparse: true });

export const Subscription =
  models.Subscription ||
  model<ISubscription>("Subscription", SubscriptionSchema);
