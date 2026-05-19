import { Schema, Document, Types, model, models } from "mongoose";

export interface IPlatformNotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  browserNotifications: boolean;
  appointmentCreated: boolean;
  appointmentApproved: boolean;
  appointmentRejected: boolean;
  appointmentRescheduled: boolean;
  appointmentCancelled: boolean;
  appointmentMessage: boolean;
  appointmentMessageEmail: boolean;
  appointmentReminder: boolean;
  reminderHours: number;
  testimonialCreated: boolean;
  testimonialReplied: boolean;
  testimonialUpdated: boolean;
  testimonialDeleted: boolean;
  testimonialMessage: boolean;
  newsletterPromotions: boolean;
  newsletterUpdates: boolean;
  newsletterTips: boolean;
}

export interface IProfilPlatforme extends Document {
  _id: Types.ObjectId;
  authUserId: Types.ObjectId;
  displayName: string;
  contactPhone: string;
  marketingPhone: string;
  logoUrl: string;
  newsletterEmail: string;
  contactEmail: string;
  cmsPages: Record<string, { title: string; slug: string; content: string; updatedAt: Date }>;
  marketingLanding: Record<string, unknown>;
  seo: {
    homeTitle: string;
    homeDescription: string;
    marketingTitle: string;
    marketingDescription: string;
  };
  geoLocation: {
    city: string;
    street: string;
    lat: number | null;
    lng: number | null;
  };
  notificationSettings: IPlatformNotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSettingsSchema = new Schema<IPlatformNotificationSettings>(
  {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    browserNotifications: { type: Boolean, default: true },
    appointmentCreated: { type: Boolean, default: true },
    appointmentApproved: { type: Boolean, default: true },
    appointmentRejected: { type: Boolean, default: true },
    appointmentRescheduled: { type: Boolean, default: true },
    appointmentCancelled: { type: Boolean, default: true },
    appointmentMessage: { type: Boolean, default: true },
    appointmentMessageEmail: { type: Boolean, default: true },
    appointmentReminder: { type: Boolean, default: true },
    reminderHours: { type: Number, default: 24, min: 1, max: 48 },
    testimonialCreated: { type: Boolean, default: true },
    testimonialReplied: { type: Boolean, default: true },
    testimonialUpdated: { type: Boolean, default: true },
    testimonialDeleted: { type: Boolean, default: true },
    testimonialMessage: { type: Boolean, default: true },
    newsletterPromotions: { type: Boolean, default: true },
    newsletterUpdates: { type: Boolean, default: true },
    newsletterTips: { type: Boolean, default: true },
  },
  { _id: false },
);

const ProfilPlatformeSchema = new Schema<IProfilPlatforme>(
  {
    authUserId: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
      unique: true,
      index: true,
    },
    displayName: { type: String, default: "Super Admin", trim: true },
    contactPhone: { type: String, default: "", trim: true },
    marketingPhone: { type: String, default: "", trim: true },
    logoUrl: { type: String, default: "", trim: true },
    newsletterEmail: { type: String, default: "", lowercase: true, trim: true },
    contactEmail: { type: String, default: "", lowercase: true, trim: true },
    cmsPages: { type: Schema.Types.Mixed, default: {} },
    marketingLanding: { type: Schema.Types.Mixed, default: {} },
    seo: {
      homeTitle: { type: String, default: "" },
      homeDescription: { type: String, default: "" },
      marketingTitle: { type: String, default: "" },
      marketingDescription: { type: String, default: "" },
    },
    geoLocation: {
      city: { type: String, default: "" },
      street: { type: String, default: "" },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    notificationSettings: {
      type: notificationSettingsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && models.ProfilPlatforme) {
  delete models.ProfilPlatforme;
}

export const ProfilPlatforme =
  models.ProfilPlatforme ||
  model<IProfilPlatforme>("ProfilPlatforme", ProfilPlatformeSchema);
