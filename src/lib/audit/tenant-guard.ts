/**
 * lib/audit/tenant-guard.ts
 *
 * Lightweight audit utilities for multi-tenant access monitoring.
 *
 * Rules:
 * - Never block a request — callers enforce access control independently
 * - Never throw — a logging failure must not crash the request
 * - Emit structured JSON for Vercel log drain compatibility
 */

import type { DecodedToken } from "@/types/auth/types";

/**
 * Logs a structured warning when the tenantId embedded in the JWT
 * does not match the tenantId resolved from the incoming request header.
 *
 * A mismatch indicates one of:
 *   - A JWT from Tenant A presented on Tenant B's subdomain
 *   - A misconfigured client sending requests to the wrong endpoint
 *   - A potential cross-tenant access attempt
 *
 * SUPER_ADMIN tokens are exempt — cross-tenant access is their intended mode.
 * Enforcement (returning 403) is always the caller's responsibility.
 *
 * @param requestTenantId — the tenantId resolved by proxy from x-tenant-id header (DB ObjectId)
 */
export function assertTenantMatch(
  decoded: DecodedToken,
  requestTenantId: string,
  routePath: string,
): void {
  // SUPER_ADMIN operates across all tenants by design — not a mismatch.
  if (decoded.isSuperAdmin) return;

  const tokenTenantId = decoded.tenantId ?? "";

  if (requestTenantId !== "" && tokenTenantId !== requestTenantId) {
    try {
      console.error(
        JSON.stringify({
          event: "TENANT_ID_MISMATCH",
          severity: "WARN",
          routeTenantId: requestTenantId,
          tokenTenantId,
          userId: decoded.id,
          userEmail: decoded.email,
          globalRole: decoded.globalRole ?? "unknown",
          path: routePath,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch {
      // JSON.stringify failure must never propagate to the request handler.
    }
  }
}
