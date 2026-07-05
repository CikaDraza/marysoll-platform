import { Schema, Document, model, models } from "mongoose";

export type PlanSlug = "maria" | "claudia" | "kiki" | "enterprise";

interface IPlan extends Document {
  name: string;
  slug: PlanSlug;
  description: string;

  priceMonthly: number;
  priceYearly: number;

  billingProvider: "internal" | "paddle";

  paddleProductId: string | null;
  paddleMonthlyPriceId: string | null;
  paddleYearlyPriceId: string | null;

  features: {
    maxAppointments: number;
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
    smsWhatsappReminders: boolean;
    teamManagement: boolean;
    multiSalon: boolean;
    customBranding: boolean;
    integrations: boolean;
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
      enum: ["maria", "claudia", "kiki", "enterprise"],
      required: true,
      unique: true,
    },
    description: { type: String, default: "" },

    priceMonthly: { type: Number, required: true, default: 0 },
    priceYearly: { type: Number, required: true, default: 0 },

    billingProvider: {
      type: String,
      enum: ["internal", "paddle"],
      default: "internal",
      required: true,
    },

    paddleProductId: { type: String, default: null },
    paddleMonthlyPriceId: { type: String, default: null },
    paddleYearlyPriceId: { type: String, default: null },

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

      smsWhatsappReminders: { type: Boolean, default: false },
      teamManagement: { type: Boolean, default: false },
      multiSalon: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      integrations: { type: Boolean, default: false },

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
