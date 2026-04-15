/**
 * lib/auth/identity.ts — SERVER-ONLY
 *
 * Tenant-Isolated Identity
 * ─────────────────────────────────────────────────────────────────────────
 * Each tenant has a completely independent user system.
 * Registration creates a TenantUser directly — no global AuthUser for clients.
 *
 * OWNER/ADMIN/STAFF also get an AuthUser (platform access), but their
 * TenantUser holds the per-tenant credentials (email + password) used for
 * salon login. AuthUser is only used for marysoll.com platform login.
 *
 * Race-condition safety: $setOnInsert upserts on the unique { tenantId, email }
 * index — concurrent requests converge to the same document.
 */
import "server-only";

import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { TenantUser } from "@/models/TenantUser";
import type { ITenantUser, TenantUserRole } from "@/models/TenantUser";

export interface TenantRegistrationData {
  name: string;
  phone?: string;
  role?: TenantUserRole;
  isEmailVerified?: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  /** Optional — only set for OWNER/ADMIN/STAFF who also have a platform AuthUser */
  authUserId?: Types.ObjectId | null;
}

export interface ResolvedTenantIdentity {
  tenantUser: HydratedDocument<ITenantUser>;
  /** true = document was just created; false = already existed */
  created: boolean;
}

/**
 * Finds or creates a TenantUser for the given (tenantId, email) pair.
 *
 * Guarantees:
 *   - Idempotent: safe to call multiple times with the same arguments.
 *   - Race-condition safe: $setOnInsert upsert on unique { tenantId, email }.
 *   - passwordHash MUST be pre-hashed by the caller (never plain text).
 *   - Existing TenantUser.password is never overwritten by $setOnInsert.
 */
export async function resolveOrCreateTenantUser(
  normalizedEmail: string,
  passwordHash: string,
  tenantId: Types.ObjectId,
  data: TenantRegistrationData,
): Promise<ResolvedTenantIdentity> {
  await connectToDB();

  const existing = await TenantUser.findOne({ tenantId, email: normalizedEmail });
  if (existing) {
    return { tenantUser: existing, created: false };
  }

  const tenantUser = await TenantUser.findOneAndUpdate(
    { tenantId, email: normalizedEmail },
    {
      $setOnInsert: {
        tenantId,
        email: normalizedEmail,
        password: passwordHash,
        name: data.name,
        phone: data.phone ?? "",
        role: data.role ?? "USER",
        authUserId: data.authUserId ?? null,
        isEmailVerified: data.isEmailVerified ?? false,
        verificationToken: data.verificationToken ?? null,
        verificationTokenExpiry: data.verificationTokenExpiry ?? null,
        status: "active",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!tenantUser) {
    throw new Error(
      `resolveOrCreateTenantUser: upsert returned null for email=${normalizedEmail} tenantId=${tenantId}`,
    );
  }

  return { tenantUser, created: true };
}
