/**
 * Subscription model — aktivna pretplata tenanta.
 *
 * Relacija: jedan Tenant ima jednu Subscription (1:1).
 *
 * Zašto zasebni model umjesto proširenja Tenant-a:
 * - Tenant sadrži business logiku (slug, customDomain, ownerId)
 * - Subscription sadrži billing logiku (status, period, usage, overrides)
 * - Razdvajanje olakšava billing migracije i audit
 *
 * Backward compat:
 * - Tenant.plan i Tenant.paid ostaju za JWT/middleware kompatibilnost
 * - LemonSqueezy webhook ažurira i Tenant i Subscription
 * - Subscription je autoritativni izvor za feature provjere
 */
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

  // Billing period
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;

  // LemonSqueezy IDs
  lsCustomerId: string | null;
  lsSubscriptionId: string | null;
  lsVariantId: string | null;
  lsOrderId: string | null;

  // Usage tracking — resetuje se mjesečno
  usage: {
    aiRequestsThisMonth: number;
    aiRequestsResetAt: Date;
    storageUsedGb: number;
    storageUpdatedAt: Date;
  };

  /**
   * Superadmin override — privremeno aktivira/deaktivira feature-e
   * bez promjene plana. Koristi se za testiranje i demo.
   */
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
      unique: true, // jedan tenant, jedna pretplata
    },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"] as PlanName[],
      required: true,
      default: "free",
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

    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dana trial
    },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // LemonSqueezy
    lsCustomerId: { type: String, default: null },
    lsSubscriptionId: { type: String, default: null },
    lsVariantId: { type: String, default: null },
    lsOrderId: { type: String, default: null },

    // Usage
    usage: {
      aiRequestsThisMonth: { type: Number, default: 0 },
      aiRequestsResetAt: { type: Date, default: Date.now },
      storageUsedGb: { type: Number, default: 0 },
      storageUpdatedAt: { type: Date, default: Date.now },
      _id: false,
    },

    // Superadmin override
    featureOverrides: { type: Schema.Types.Mixed, default: null },
    overrideExpiresAt: { type: Date, default: null },
    overrideNote: { type: String, default: null },
  },
  { timestamps: true },
);

// Indeksi
SubscriptionSchema.index({ tenantId: 1 }, { unique: true });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ lsSubscriptionId: 1 }, { sparse: true });

export const Subscription =
  models.Subscription ||
  model<ISubscription>("Subscription", SubscriptionSchema);
