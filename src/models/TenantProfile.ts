/**
 * TenantProfile — per-tenant identity projection.
 *
 * Represents a single person's membership and profile data within one tenant.
 * One document per (identity × tenant) pair — the same person can have profiles
 * in multiple tenants.
 *
 * Responsibilities:
 *   - name, phone (per-tenant contact info)
 *   - link back to the global UserIdentity (identityId)
 *   - link back to the legacy User document (legacyUserId, nullable migration bridge)
 *
 * Does NOT hold:
 *   - credentials (email, passwordHash) — those live on UserIdentity
 *   - tenant configuration — that lives on Tenant
 *   - appointment or campaign data — those carry their own tenantId
 *
 * legacyUserId — bridge field used during migration.
 * Points to the original User document this profile was derived from.
 * Null for profiles created after the migration is complete.
 */

import { Schema, Document, Types, model, models } from "mongoose";

export interface ITenantProfile extends Document {
  identityId: Types.ObjectId;
  tenantId: Types.ObjectId;
  legacyUserId: Types.ObjectId | null;
  name: string;
  phone: string;
  tenantRole: "USER" | "STAFF" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
}

const tenantProfileSchema = new Schema<ITenantProfile>(
  {
    identityId: {
      type: Schema.Types.ObjectId,
      ref: "UserIdentity",
      required: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    legacyUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    tenantRole: {
      type: String,
      enum: ["USER", "STAFF", "ADMIN"],
      default: "USER",
    },
  },
  { timestamps: true },
);

// Primary uniqueness constraint — one profile per identity per tenant.
// This is the guard that $setOnInsert upserts rely on.
tenantProfileSchema.index({ identityId: 1, tenantId: 1 }, { unique: true });

// Tenant-scoped lookups (list all profiles for a given tenant).
tenantProfileSchema.index({ tenantId: 1 });

// Sparse — post-migration profiles will have null here.
// Sparse prevents uniqueness conflicts among multiple null entries.
tenantProfileSchema.index({ legacyUserId: 1 }, { sparse: true });

export const TenantProfile =
  models.TenantProfile ||
  model<ITenantProfile>("TenantProfile", tenantProfileSchema);
