import mongoose, { model, models, Schema, Types } from "mongoose";

export type LandingTheme = "theme-1" | "theme-2" | "theme-3";

const itemsSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
});

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
    landingStructure: {
      hero: {
        headline: { type: String, required: false },
        subheadline: { type: String, required: false },
        whereWhatForWhom: { type: String, required: false },
      },
      CTA: {
        label: { type: String, required: false },
        href: { type: String, required: false },
      },
      portfolio: {
        headline: { type: String, required: false },
        subheadline: { type: String, required: false },
        categories: {
          name: { type: String, required: false },
          images: { type: [String], required: false },
        },
      },
      services: { type: [Schema.Types.ObjectId], ref: "Service" },
      about: {
        headline: { type: String, required: false },
        descriptions: { type: [String], required: false },
      },
      appointmentProcess: {
        headline: { type: String, required: false },
        subheadline: { type: String, required: false },
        items: { type: [String], required: false },
      },
      testimonials: {
        headline: { type: String, required: false },
        subheadline: { type: String, required: false },
      },
      faq: {
        headline: { type: String, required: false },
        subheadline: { type: String, required: false },
        items: [itemsSchema],
      },
    },
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
