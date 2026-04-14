/**
 * UserIdentity — global platform identity.
 *
 * Represents the authentication record for a person on the platform.
 * One document per unique email address, regardless of how many tenants
 * that person belongs to.
 *
 * Responsibilities:
 *   - email / password (hashed)
 *   - email verification state
 *   - password reset tokens
 *   - platform-level role (SUPER_ADMIN or OWNER only)
 *
 * Does NOT hold:
 *   - per-tenant profile data (name, phone, preferences)
 *   - tenant-scoped roles (USER, STAFF, ADMIN)
 *   - appointment or campaign data
 *
 * legacyUserId — bridge field used during migration.
 * Points to the original User document this identity was derived from.
 * Null for identities created after the migration is complete.
 */

import { Schema, Document, Types, model, models } from "mongoose";

export interface IUserIdentity extends Document {
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpiry: Date | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  platformRole?: "SUPER_ADMIN" | "OWNER";
  legacyUserId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const userIdentitySchema = new Schema<IUserIdentity>(
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
      required: false,
    },
    legacyUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Global unique constraint on email — one identity per email address across
// the entire platform. Defined as a separate index call (not inline on the
// field) to keep schema definition and index definitions visually separated,
// consistent with the User model pattern.
userIdentitySchema.index({ email: 1 }, { unique: true });

// Sparse index — most legacy migration entries will have a value, but
// identities created post-migration will have legacyUserId: null.
// Sparse ensures null documents are excluded from the index entirely,
// preventing a uniqueness conflict among multiple null entries.
userIdentitySchema.index({ legacyUserId: 1 }, { sparse: true });

export const UserIdentity =
  models.UserIdentity || model<IUserIdentity>("UserIdentity", userIdentitySchema);
