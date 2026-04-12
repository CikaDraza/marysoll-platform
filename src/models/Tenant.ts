/**
 * Tenant model — represents a beauty salon on the platform.
 * Each tenant maps to one salon owner (isAdmin: true User).
 * All other models reference tenantId for data isolation.
 */
import { Schema, Document, Types, model, models } from "mongoose";

export interface ITenant extends Document {
  name: string;
  slug: string;
  subdomain: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  paid: boolean;
  verified: boolean;
  plan: "free" | "starter" | "pro" | "enterprise";
  planExpiresAt: Date | null;
  trialEndsAt: Date | null;
  isTrialActive: boolean;
  trialMode: "free" | "card_required"; // how this tenant's trial was initiated
  trialRequiredCard: boolean; // true if card was provided at signup
  ownerId: Types.ObjectId;
  salonProfileId: Types.ObjectId | null;
  cloudinaryFolder: string;
  lemonsqueezyCustomerId: string | null;
  lemonsqueezySubscriptionId: string | null;
  aiSettings: {
    chatEnabled: boolean;
    landingEnabled: boolean;
    imageEnabled: boolean;
    chatRpmLimit: number;
    landingRpmLimit: number;
    imageRpmLimit: number;
  };
  storageMetrics: {
    mongoUsageMb: number;
    cloudinaryUsageMb: number;
    updatedAt: Date;
  };
  status: "active" | "suspended" | "pending" | "cancelled";
  isDemo: { type: boolean; default: false };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    // unique:true creates index automatically — no need for schema.index({ slug: 1 })
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    subdomain: { type: String, required: true, unique: true, lowercase: true },
    // sparse: true sa unique — OK, nema duplikata
    customDomain: { type: String, default: null, unique: true, sparse: true },
    customDomainVerified: { type: Boolean, default: false },
    paid: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    planExpiresAt: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },
    isTrialActive: { type: Boolean, default: false },
    trialMode: {
      type: String,
      enum: ["free", "card_required"],
      default: "free",
    },
    trialRequiredCard: { type: Boolean, default: false },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    salonProfileId: {
      type: Schema.Types.ObjectId,
      ref: "SalonProfile",
      default: null,
    },
    cloudinaryFolder: { type: String, required: true },
    lemonsqueezyCustomerId: { type: String, default: null },
    lemonsqueezySubscriptionId: { type: String, default: null },
    aiSettings: {
      chatEnabled: { type: Boolean, default: true },
      landingEnabled: { type: Boolean, default: true },
      imageEnabled: { type: Boolean, default: true },
      chatRpmLimit: { type: Number, default: 10 },
      landingRpmLimit: { type: Number, default: 5 },
      imageRpmLimit: { type: Number, default: 3 },
      _id: false,
    },
    storageMetrics: {
      mongoUsageMb: { type: Number, default: 0 },
      cloudinaryUsageMb: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
      _id: false,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

TenantSchema.index({ status: 1, ownerId: 1 });

export const Tenant = models.Tenant || model<ITenant>("Tenant", TenantSchema);
