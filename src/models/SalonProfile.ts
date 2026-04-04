import mongoose, { model, models, Types } from "mongoose";

export type LandingTheme = "theme-1" | "theme-2" | "theme-3";

const SalonProfileSchema = new mongoose.Schema(
  {
    tenantId: {
      type: Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    description: { type: String },
    logo: { type: String, required: false, default: null },
    phone: { type: String, required: false, default: "" },
    city: { type: String, required: false, default: "" },
    street: { type: String, required: false, default: "" },
    social: {
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      tiktok: { type: String, default: "" },
    },
    newsletterEmail: { type: String, required: false, default: "" },
    contactEmail: { type: String, required: false, default: "" },
    workingHours: { type: Object, default: {} },

    // SEO Meta
    seo: {
      homeTitle: { type: String, default: "" },
      homeDescription: { type: String, default: "" },
      uslugeTitle: { type: String, default: "" },
      uslugeDescription: { type: String, default: "" },
      terminiTitle: { type: String, default: "" },
      terminiDescription: { type: String, default: "" },
    },

    // Branding
    branding: {
      primaryColor: { type: String, default: "#a855f7" },
      secondaryColor: { type: String, default: "#ec4899" },
      fontFamily: { type: String, default: "Inter" },
    },

    // Landing page theme selection
    landingTheme: {
      type: String,
      enum: ["theme-1", "theme-2", "theme-3"],
      default: "theme-1",
    },
  },
  { timestamps: true },
);

export const SalonProfile =
  models.SalonProfile || model("SalonProfile", SalonProfileSchema);
