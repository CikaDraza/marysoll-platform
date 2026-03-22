import { Schema, Document, model, models } from "mongoose";

export interface IPlan extends Document {
  name: string;
  slug: "free" | "starter" | "pro" | "enterprise";
  description: string;
  priceMonthly: number; // in EUR
  priceYearly: number;
  lemonsqueezyVariantId: string | null;
  features: {
    maxAppointments: number; // -1 = unlimited
    maxServices: number;
    maxClients: number;
    aiChat: boolean;
    aiLanding: boolean;
    aiImages: boolean;
    customDomain: boolean;
    newsletter: boolean;
    analytics: boolean;
    pushNotifications: boolean;
    prioritySupport: boolean;
  };
  isActive: boolean;
  isHighlighted: boolean;
  trialDays: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true },
    slug: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      required: true,
      unique: true,
    },
    description: { type: String, default: "" },
    priceMonthly: { type: Number, required: true, default: 0 },
    priceYearly: { type: Number, required: true, default: 0 },
    lemonsqueezyVariantId: { type: String, default: null },
    features: {
      maxAppointments: { type: Number, default: 50 },
      maxServices: { type: Number, default: 10 },
      maxClients: { type: Number, default: 100 },
      aiChat: { type: Boolean, default: false },
      aiLanding: { type: Boolean, default: false },
      aiImages: { type: Boolean, default: false },
      customDomain: { type: Boolean, default: false },
      newsletter: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      _id: false,
    },
    isActive: { type: Boolean, default: true },
    isHighlighted: { type: Boolean, default: false },
    trialDays: { type: Number, default: 14 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Plan = models.Plan || model<IPlan>("Plan", PlanSchema);
