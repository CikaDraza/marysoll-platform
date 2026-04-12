import { Schema, model, models } from "mongoose";
import { IUser } from "@/types";

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    marketingPhone: { type: String, default: "" },
    newsletterEmail: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    birthday: { type: Date, default: null, required: false },
    isAdmin: { type: Boolean, default: false },
    isSuperAdmin: { type: Boolean, default: false },
    /**
     * globalRole — platformska rola korisnika.
     * "SUPER_ADMIN" = superadmin pristup svim salonima.
     * "OWNER"       = vlasnik salona (tenant admin).
     * "ADMIN"       = admin salona.
     * "STAFF"       = zaposleni u salonu.
     * "USER"        = obični klijent.
     *
     * Backward compat: isAdmin i isSuperAdmin ostaju za JWT kompatibilnost.
     */
    globalRole: {
      type: String,
      enum: ["SUPER_ADMIN", "OWNER", "ADMIN", "STAFF", "USER", "DEMO"],
      default: "USER",
    },
    // Multi-tenant: null = super admin or guest without tenant
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null },
    agreedToPrivacy: { type: Boolean, required: true },
    isOnline: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    userType: {
      type: String,
      enum: ["guest", "legal"],
      default: "legal",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpiry: {
      type: Date,
      default: null,
    },
    notificationSettings: {
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
      _id: false,
    },
    pushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    newsletterPreferences: {
      subscribed: { type: Boolean, default: false },
      subscriptionDate: { type: Date },
      subscriptionSource: {
        type: String,
        enum: ["footer", "dashboard", "checkout", "admin"],
      },
      emailVerified: { type: Boolean, default: false },
      verificationToken: { type: String },
      verifiedAt: { type: Date },
      unsubscribeToken: { type: String },
      unsubscribedAt: { type: Date },
      lastEmailSent: { type: Date },
      openCount: { type: Number, default: 0 },
      clickCount: { type: Number, default: 0 },
      _id: false,
    },
  },
  { timestamps: true },
);

userSchema.index({ tenantId: 1 });

export const User = models.User || model<IUser>("User", userSchema);
