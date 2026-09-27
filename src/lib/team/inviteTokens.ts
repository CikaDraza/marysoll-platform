import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PASSWORD_SALT_ROUNDS } from "@/lib/auth/passwordSync";

export const TEAM_INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export function hashTeamInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createTeamInviteToken(now = new Date()): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = randomBytes(32).toString("hex");
  return {
    rawToken,
    tokenHash: hashTeamInviteToken(rawToken),
    expiresAt: new Date(now.getTime() + TEAM_INVITE_TTL_MS),
  };
}

/** Required TenantUser credential that can never be known or used by the owner. */
export async function createUnknownPlaceholderPassword(): Promise<string> {
  return bcrypt.hash(randomBytes(48).toString("base64url"), PASSWORD_SALT_ROUNDS);
}
