/**
 * Deljeni tipovi proxy (middleware) sloja.
 * Security boundary: tenantId (DB _id) — nikad slug sam (vidi proxy.ts).
 *
 * Tipovi koji pripadaju platformskim klijentima žive uz njih:
 * DecodedToken → lib/platform/identity-client, TenantResolution → tenant-client.
 */

/** Populated by guards when a token refresh occurs; pipeline finalize sets the cookie. */
export interface AuthOut {
  refreshedCookie?: { name: string; value: string };
}

export type DomainType = "marketing" | "admin" | "superadmin" | "client";
