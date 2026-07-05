/**
 * Auth sloj proxy-ja: čitanje/verifikacija JWT-a, refresh kroz interne
 * rute, i guardovi za API/stranice. Tenant token MORA da pripada razrešenom
 * tenantId-ju (cross-tenant zaštita) — superadmin/platform tokeni su izuzeti.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { AuthOut, DecodedToken } from "./types";
import { INTERNAL_FETCH_HEADERS, IS_PROD } from "./constants";

// ─── Token helpers ────────────────────────────────────────────────────────────

/**
 * Reads the access token from the request.
 * Priority: Authorization header → tenant-access-token → platform-access-token.
 */
function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  return (
    request.cookies.get("tenant-access-token")?.value ??
    request.cookies.get("platform-access-token")?.value ??
    null
  );
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
 * Attempts to refresh the access token using the appropriate refresh endpoint.
 */
async function tryRefreshToken(request: NextRequest): Promise<string | null> {
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

/** Applies a refreshed token cookie to a response. */
export function applyRefreshedCookie(response: NextResponse, out: AuthOut): void {
  if (!out.refreshedCookie) return;
  response.cookies.set(out.refreshedCookie.name, out.refreshedCookie.value, {
    httpOnly: false,
    sameSite: "lax",
    secure: IS_PROD,
    path: "/",
  });
}

// ─── Auth guards ──────────────────────────────────────────────────────────────

/**
 * Validates the tenant token against the resolved tenantId.
 * Returns 401 if the token is a tenant token but belongs to a different tenant.
 * SUPER_ADMIN and platform tokens are exempt.
 */
function validateTenantTokenId(
  decoded: DecodedToken,
  resolvedTenantId: string | null,
): NextResponse | null {
  if (!resolvedTenantId) return null;
  if (decoded.isSuperAdmin) return null;
  if (decoded.type === "platform") return null;

  if (!decoded.tenantId || decoded.tenantId !== resolvedTenantId) {
    return NextResponse.json(
      { error: "Unauthorized: token does not belong to this tenant" },
      { status: 401 },
    );
  }
  return null;
}

export async function guardApi(
  request: NextRequest,
  resolvedTenantId: string | null,
  needAdmin = false,
  needSuperAdmin = false,
  out: AuthOut = {},
): Promise<NextResponse | null> {
  let token = getToken(request);
  let decoded = token ? await verifyToken(token) : null;
  if (!decoded) {
    token = await tryRefreshToken(request);
    decoded = token ? await verifyToken(token) : null;
    if (!decoded)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Token was refreshed — store cookie info so caller can set it on the response
    const cookieName =
      decoded.type === "tenant"
        ? "tenant-access-token"
        : "platform-access-token";
    out.refreshedCookie = { name: cookieName, value: token! };
  }

  const tenantMismatch = validateTenantTokenId(decoded, resolvedTenantId);
  if (tenantMismatch) return tenantMismatch;

  if (needSuperAdmin && !decoded.isSuperAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (needAdmin && !decoded.isAdmin && !decoded.isSuperAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function guardPage(
  request: NextRequest,
  resolvedTenantId: string | null,
  needAdmin = false,
  needSuperAdmin = false,
  out: AuthOut = {},
): Promise<NextResponse | null> {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
  const loginUrl = new URL(`https://${baseDomain}/login`);
  const unauthorizedUrl = new URL("/unauthorized", request.url);

  let token = getToken(request);
  let decoded = token ? await verifyToken(token) : null;
  if (!decoded) {
    token = await tryRefreshToken(request);
    decoded = token ? await verifyToken(token) : null;
    if (!decoded) return NextResponse.redirect(loginUrl);
    // Token was refreshed — store cookie info so caller can set it on the response
    const cookieName =
      decoded.type === "tenant"
        ? "tenant-access-token"
        : "platform-access-token";
    out.refreshedCookie = { name: cookieName, value: token! };
  }

  const tenantMismatch = validateTenantTokenId(decoded, resolvedTenantId);
  if (tenantMismatch) return NextResponse.redirect(loginUrl);

  if (needSuperAdmin && !decoded.isSuperAdmin)
    return NextResponse.redirect(unauthorizedUrl);
  if (needAdmin && !decoded.isAdmin && !decoded.isSuperAdmin)
    return NextResponse.redirect(unauthorizedUrl);
  return null;
}

