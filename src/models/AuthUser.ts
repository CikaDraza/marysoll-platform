/**
 * AuthUser — global platform identity.
 *
 * One document per unique email address across the entire platform.
 * Holds ONLY authentication data: credentials, email verification,
 * password reset tokens, and platform-level role.
 *
 * Does NOT hold per-tenant data (name, phone, role, preferences).
 * Per-tenant data lives in TenantUser.
 *
 * platformRole is only set for SUPER_ADMIN and OWNER.
 * Regular clients (USER/STAFF/ADMIN) have platformRole: null.
 */

import { Schema, Document, Types, model, models } from "mongoose";

export interface IAuthUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpiry: Date | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  platformRole: "SUPER_ADMIN" | "OWNER" | null;
  createdAt: Date;
  updatedAt: Date;
}

const authUserSchema = new Schema<IAuthUser>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
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
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    platformRole: {
      type: String,
      enum: ["SUPER_ADMIN", "OWNER"],
      default: null,
    },
  },
  { timestamps: true },
);

// Global unique constraint — one identity per email across the entire platform.
authUserSchema.index({ email: 1 }, { unique: true });

export const AuthUser =
  models.AuthUser || model<IAuthUser>("AuthUser", authUserSchema);
