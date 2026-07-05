/**
 * Deljeni tipovi proxy (middleware) modula.
 * Security boundary: tenantId (DB _id) — nikad slug sam (vidi proxy.ts).
 */

export interface DecodedToken {
  id: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  tenantId?: string;
  /** "platform" = SUPER_ADMIN (AuthUser). "tenant" = any TenantUser role. */
  type?: "platform" | "tenant";
  exp: number;
}

/** Populated by guards when a token refresh occurs; caller sets the cookie on the response. */
export interface AuthOut {
  refreshedCookie?: { name: string; value: string };
}

export type DomainType = "marketing" | "admin" | "superadmin" | "client";
export type TenantResolution = {
  slug: string;
  id: string;
  customDomain: string | null;
};

