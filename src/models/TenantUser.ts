/**
 * TenantUser — per-tenant user profile (SINGLE SOURCE OF TRUTH for tenant identity).
 *
 * Architecture: Tenant-Isolated Identity
 * ─────────────────────────────────────
 * Each tenant has a completely independent user system.
 * The same email can exist across tenants with different passwords,
 * names, and verification status. There is NO global email uniqueness.
 *
 * Unique constraint: { tenantId, email } — no duplicates within one salon,
 * duplicates freely allowed across different salons.
 *
 * Auth separation:
 *   - ALL roles authenticate via /api/tenant-auth/login using TenantUser only.
 *   - SUPER_ADMIN authenticates via /api/auth/login using AuthUser only.
 *   - TenantUser is NEVER used in platform auth logic; AuthUser is NEVER used in tenant auth.
 *
 * authUserId (Option B — kept for internal linking only):
 *   - Optionally set for OWNER/ADMIN/STAFF who also have a platform AuthUser record.
 *   - Used only for internal features: push notifications, newsletter delivery, etc.
 *   - MUST NOT be used for login, token generation, or any auth decision.
 *   - Null for USER/GUEST clients.
 *
 * Roles:
 *   OWNER  — tenant owner, full access
 *   ADMIN  — salon administrator
 *   STAFF  — employee (limited admin)
 *   USER   — registered client
 *   GUEST  — anonymous booking, no credentials
 */

import { Schema, Document, Types, model, models } from "mongoose";

export type TenantUserRole = "OWNER" | "ADMIN" | "STAFF" | "USER" | "GUEST";

export interface ITenantUserNotificationSettings {
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

export interface ITenantUserNewsletterPreferences {
  subscribed: boolean;
  subscriptionDate?: Date;
  subscriptionSource?: "footer" | "dashboard" | "checkout" | "admin";
  emailVerified: boolean;
  verificationToken?: string;
  verifiedAt?: Date;
  unsubscribeToken?: string;
  unsubscribedAt?: Date;
  lastEmailSent?: Date;
  openCount: number;
  clickCount: number;
}

export interface ITenantUserPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
}

interface ITenantUser extends Document {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  /**
   * Optional link to a platform AuthUser.
   * Used only for internal features (notifications, newsletter delivery).
   * MUST NOT be used in any auth/login logic.
   */
  authUserId?: Types.ObjectId | null;

  // ── Per-tenant identity ──────────────────────────────────────────────────
  email: string;
  password: string;
  isEmailVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpiry?: Date | null;
  status: "active" | "invited" | "suspended";

  // ── Profile ──────────────────────────────────────────────────────────────
  name: string;
  phone?: string;
  role: TenantUserRole;
  permissions?: Record<string, unknown>;
  instagram?: string;
  tiktok?: string;
  /** Pun datum rođenja (profil klijenta). Loyalty birthday reward čita
   *  dan/mesec sa LoyaltyAccount.birthday — ovo je izvor za profil. */
  birthday?: Date | null;

  // ── Activity ─────────────────────────────────────────────────────────────
  isOnline: boolean;
  lastActive: Date;

  // ── Settings ─────────────────────────────────────────────────────────────
  notificationSettings: ITenantUserNotificationSettings;
  newsletterPreferences: ITenantUserNewsletterPreferences;
  pushSubscriptions: ITenantUserPushSubscription[];

  createdAt: Date;
  updatedAt: Date;
}

const tenantUserSchema = new Schema<ITenantUser>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    authUserId: {
      type: Schema.Types.ObjectId,
      ref: "AuthUser",
      default: null,
    },

    // ── Per-tenant identity ────────────────────────────────────────────────
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
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
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpiry: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "invited", "suspended"],
      default: "active",
    },

    // ── Profile ────────────────────────────────────────────────────────────
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "STAFF", "USER", "GUEST"],
      default: "USER",
      index: true,
    },
    permissions: {
      type: Schema.Types.Mixed,
      default: null,
    },
    instagram: {
      type: String,
      trim: true,
      default: null,
    },
    tiktok: {
      type: String,
      default: null,
    },
    birthday: {
      type: Date,
      default: null,
    },

    // ── Activity ───────────────────────────────────────────────────────────
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },

    // ── Notification settings ──────────────────────────────────────────────
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

    // ── Newsletter ────────────────────────────────────────────────────────
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

    // ── Push subscriptions ────────────────────────────────────────────────
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
  },
  { timestamps: true },
);

// PRIMARY UNIQUE CONSTRAINT — one identity per email per tenant.
// Same email allowed across different tenants.
tenantUserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Efficient listing of admins/staff/users per tenant.
tenantUserSchema.index({ tenantId: 1, role: 1 });

// In dev, delete the cached model so schema changes take effect after hot reload.
if (process.env.NODE_ENV !== "production" && models.TenantUser) {
  delete models.TenantUser;
}

export const TenantUser = models.TenantUser || model<ITenantUser>("TenantUser", tenantUserSchema);
