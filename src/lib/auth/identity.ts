/**
 * lib/auth/identity.ts
 *
 * SERVER-ONLY — do not import in Client Components.
 *
 * resolveOrCreateIdentity is the single source of truth for the three-layer
 * identity chain:
 *
 *   UserIdentity  — global, one per email address across the entire platform
 *   TenantProfile — per-tenant, one per (identityId × tenantId) pair
 *   User          — legacy document, maintained for backward compatibility
 *
 * All three layers are resolved or created in a single call, using only
 * atomic upsert operations to eliminate TOCTOU races.
 */
import "server-only";

import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { UserIdentity } from "@/models/UserIdentity";
import type { IUserIdentity } from "@/models/UserIdentity";
import { TenantProfile } from "@/models/TenantProfile";
import type { ITenantProfile } from "@/models/TenantProfile";
import { User } from "@/models/User";
import type { IUser } from "@/types";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface RegistrationData {
  name?: string;
  phone?: string;
  /** Must be true for any registration flow. Defaults to false only as a safe migration sentinel. */
  agreedToPrivacy?: boolean;
  isEmailVerified?: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
}

export interface ResolvedIdentity {
  identity: HydratedDocument<IUserIdentity>;
  profile: HydratedDocument<ITenantProfile>;
  legacyUser: HydratedDocument<IUser>;
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Resolves or creates the three-layer identity chain for (email, tenantId).
 *
 * Guarantees:
 *   - Idempotent: safe to call multiple times with the same arguments.
 *   - Race-condition safe: all writes use $setOnInsert upserts or null-guarded
 *     filters — concurrent calls converge to the same documents.
 *   - No double-hashing: passwordHash MUST be pre-hashed by the caller.
 *   - Existing identity.passwordHash is never overwritten.
 *   - Throws only on critical DB failure.
 *
 * @param email            Raw email — normalized internally.
 * @param passwordHash     Pre-hashed bcrypt value. Never plain text.
 * @param tenantId         Tenant this registration belongs to.
 * @param registrationData Optional name / phone for profile population.
 */
export async function resolveOrCreateIdentity(
  email: string,
  passwordHash: string,
  tenantId: Types.ObjectId,
  registrationData: RegistrationData,
): Promise<ResolvedIdentity> {
  await connectToDB();

  // ── Step 1: Normalize email ────────────────────────────────────────────────

  const normalizedEmail = email.toLowerCase().trim();

  // ── Step 2: Find or create UserIdentity ───────────────────────────────────
  //
  // EMAIL IS GLOBAL UNIQUE — always lookup by email first.
  //
  // $setOnInsert: fields are only written on the first insert.
  // If an identity already exists for this email, passwordHash is preserved
  // and no fields are overwritten — the existing document is returned as-is.

  const identity = await UserIdentity.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $setOnInsert: {
        email: normalizedEmail,
        passwordHash,
        isEmailVerified: registrationData.isEmailVerified ?? false,
        legacyUserId: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!identity) {
    throw new Error(
      `resolveOrCreateIdentity: UserIdentity upsert returned null for email=${normalizedEmail}`,
    );
  }

  // ── Step 3: Find or create TenantProfile ──────────────────────────────────
  //
  // ONE PROFILE PER TENANT — unique constraint on (identityId, tenantId).
  // Two concurrent requests race on the DB index; one insert wins, the other
  // receives the existing document via new:true.

  const profile = await TenantProfile.findOneAndUpdate(
    { identityId: identity._id, tenantId },
    {
      $setOnInsert: {
        identityId: identity._id,
        tenantId,
        name: registrationData.name ?? "",
        phone: registrationData.phone ?? "",
        tenantRole: "USER",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!profile) {
    throw new Error(
      `resolveOrCreateIdentity: TenantProfile upsert returned null for identityId=${identity._id} tenantId=${tenantId}`,
    );
  }

  // ── Step 4: Find or create legacy User ────────────────────────────────────
  //
  // LEGACY USER MUST STILL EXIST — backward compatibility with all existing
  // JWT tokens, appointments, testimonials, and session data.
  //
  // Unique constraint { email, tenantId } on the User schema is the race guard.
  // $setOnInsert means an existing user's data is never touched.

  const legacyUser = await User.findOneAndUpdate(
    { email: normalizedEmail, tenantId },
    {
      $setOnInsert: {
        email: normalizedEmail,
        password: passwordHash,         // stored as-is — NOT re-hashed
        tenantId,
        userType: "legal",
        name: registrationData.name ?? "",
        phone: registrationData.phone ?? "",
        // Caller MUST pass true for any real registration. False is only a
        // safe sentinel for migration-path calls where consent was captured
        // through a prior flow.
        agreedToPrivacy: registrationData.agreedToPrivacy ?? false,
        isEmailVerified: registrationData.isEmailVerified ?? false,
        verificationToken: registrationData.verificationToken ?? null,
        verificationTokenExpiry: registrationData.verificationTokenExpiry ?? null,
        isOnline: false,
        lastActive: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!legacyUser) {
    throw new Error(
      `resolveOrCreateIdentity: User upsert returned null for email=${normalizedEmail} tenantId=${tenantId}`,
    );
  }

  // ── Step 5: Cross-link references ─────────────────────────────────────────
  //
  // Ensure legacyUserId is set on both identity and profile.
  // Filter includes `legacyUserId: null` — this is the race guard:
  //   - If this request wins → sets the value.
  //   - If another concurrent request already set it → filter matches nothing,
  //     the update is a silent no-op. Never overwrites an existing link.

  if (!identity.legacyUserId) {
    await UserIdentity.findOneAndUpdate(
      { _id: identity._id, legacyUserId: null },
      { $set: { legacyUserId: legacyUser._id } },
    );
    // legacyUser._id is a real ObjectId at runtime. The cast is needed because
    // IUser in @/types/index.ts has a duplicate interface declaration where one
    // branch types _id as string — a known type debt in that file.
    identity.legacyUserId = legacyUser._id as unknown as Types.ObjectId;
  }

  if (!profile.legacyUserId) {
    await TenantProfile.findOneAndUpdate(
      { _id: profile._id, legacyUserId: null },
      { $set: { legacyUserId: legacyUser._id } },
    );
    profile.legacyUserId = legacyUser._id as unknown as Types.ObjectId;
  }

  // ── Step 6: Return all three ───────────────────────────────────────────────

  return { identity, profile, legacyUser };
}
