/**
 * Identity Client — platformski adapter za identitet.
 *
 * DANAS: jose verifikacija JWT-a, refresh kroz interne auth rute i tenant
 * access provera nad dekodiranim tokenom.
 * SUTRA: Identity Engine (verify / refresh / roles / tenantAccess) —
 * potrošači (proxy guardovi) ne poznaju implementaciju.
 */
import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { INTERNAL_FETCH_HEADERS } from "./internal-fetch";

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

/**
 * Verifies a JWT using the server-side secret (jose jwtVerify).
 * Returns null if the token is invalid, expired, or the signature fails.
 */
async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload as unknown as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Attempts to refresh the access token using the appropriate refresh endpoint
 * (tenant-refresh-token → tenant ruta, platform-refresh-token → platform ruta).
 */
async function refreshAccessToken(request: NextRequest): Promise<string | null> {
  const tenantRefresh = request.cookies.get("tenant-refresh-token")?.value;
  const platformRefresh = request.cookies.get("platform-refresh-token")?.value;

  if (tenantRefresh) {
    return attemptRefresh(
      request,
      "tenant-refresh-token",
      tenantRefresh,
      "/api/tenant-auth/refresh",
    );
  }
  if (platformRefresh) {
    return attemptRefresh(
      request,
      "platform-refresh-token",
      platformRefresh,
      "/api/auth/refresh",
    );
  }
  return null;
}

async function attemptRefresh(
  request: NextRequest,
  cookieName: string,
  cookieValue: string,
  endpoint: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${request.nextUrl.origin}${endpoint}`, {
      method: "POST",
      headers: {
        Cookie: `${cookieName}=${cookieValue}`,
        ...INTERNAL_FETCH_HEADERS(),
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Cross-tenant provera: tenant token mora da pripada razrešenom tenantId-ju.
 * SUPER_ADMIN i platform tokeni su izuzeti.
 */
function validateTenantAccess(
  decoded: DecodedToken,
  resolvedTenantId: string | null,
): boolean {
  if (!resolvedTenantId) return true;
  if (decoded.isSuperAdmin) return true;
  if (decoded.type === "platform") return true;
  return !!decoded.tenantId && decoded.tenantId === resolvedTenantId;
}

export const identityClient = {
  verifyToken,
  refreshAccessToken,
  validateTenantAccess,
};
