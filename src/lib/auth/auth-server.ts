/**
 * lib/auth/auth-server.ts
 *
 * SERVER-ONLY auth funkcije.
 * NE importovati ovo u Client Components ili hooks!
 * Koristi se isključivo u API route handlers i middleware-u.
 */
import "server-only";

import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import type { ITenant } from "@/models/Tenant";
import { DecodedToken } from "@/types/auth/types";
import { assertTenantMatch } from "@/lib/audit/tenant-guard";

export function generateAccessToken(
  id: string,           // AuthUser._id for platform; TenantUser._id for tenant
  email: string,
  isAdmin: boolean,
  name: string,
  tenantUserId: string | null,  // TenantUser._id — null for platform tokens
  tenantId: string | null = null,
  isSuperAdmin = false,
  globalRole = "USER",
  tenantSlug: string | null = null,
  type: "platform" | "tenant" = "tenant",
): string {
  return jwt.sign(
    { id, email, isAdmin, name, tenantUserId, tenantId, isSuperAdmin, globalRole, tenantSlug, type },
    process.env.JWT_SECRET!,
    { expiresIn: "30d" },
  );
}

export function generateRefreshToken(
  id: string,           // AuthUser._id for platform; TenantUser._id for tenant
  email: string,
  isAdmin: boolean,
  tenantUserId: string | null,  // TenantUser._id — null for platform tokens
  tenantId: string | null = null,
  isSuperAdmin = false,
  type: "platform" | "tenant" = "tenant",
): string {
  return jwt.sign(
    { id, email, isAdmin, tenantUserId, tenantId, isSuperAdmin, type },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "30d" },
  );
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as DecodedToken;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(
  request: NextRequest | Request,
): string | null {
  // 1. Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.split(" ")[1];

  // 2. NextRequest cookies API — scoped cookies only, no legacy fallbacks
  if ("cookies" in request) {
    const req = request as NextRequest;
    const token =
      req.cookies.get("tenant-access-token")?.value ??
      req.cookies.get("platform-access-token")?.value ??
      null;
    if (token) return token;
  }

  // 3. Raw Cookie header (plain Request objects in route handlers)
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match =
      cookieHeader.match(/(?:^|;\s*)tenant-access-token=([^;]+)/) ??
      cookieHeader.match(/(?:^|;\s*)platform-access-token=([^;]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
}

export function getDecodedFromRequest(
  request: NextRequest,
): DecodedToken | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

/** Tenant resolution iz request headera (proxy.ts ih ubacuje) */
export async function resolveTenant(
  request: NextRequest,
): Promise<ITenant | null> {
  await connectToDB();
  const tenantSlug = request.headers.get("x-tenant-slug");
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const BASE_DOMAIN = "marysoll.com";

  if (!tenantSlug || tenantSlug === "default" || tenantSlug === "") return null;

  const bySlug = await Tenant.findOne({ slug: tenantSlug, status: "active" });
  if (bySlug) return bySlug;

  if (!hostname.endsWith(BASE_DOMAIN)) {
    return Tenant.findOne({
      customDomain: hostname,
      customDomainVerified: true,
      status: "active",
    });
  }

  return null;
}

/**
 * Guard za admin API rute.
 * Vraća { decoded } ako je korisnik autentifikovan i isAdmin=true.
 * Vraća NextResponse (401/403) ako nije.
 */

export type AdminAuthResult =
  | { success: true; decoded: DecodedToken }
  | { success: false; response: NextResponse };

export function requireAdmin(request: Request): AdminAuthResult {
  const token = getTokenFromRequest(request);
  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 },
      ),
    };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Nevažeći ili istekao token" },
        { status: 401 },
      ),
    };
  }

  // Cross-check: token's tenantId must match the tenantId resolved by proxy.
  // SUPER_ADMIN is exempt — they operate across all tenants.
  const isSuperAdmin = decoded.isSuperAdmin ?? false;
  const requestTenantId = request.headers.get("x-tenant-id") ?? "";
  const tokenTenantId = decoded.tenantId ?? "";

  if (requestTenantId !== "" && !isSuperAdmin && tokenTenantId !== requestTenantId) {
    // Log the mismatch via the audit utility before rejecting.
    assertTenantMatch(decoded, requestTenantId, request.url);
    return {
      success: false,
      response: NextResponse.json(
        { error: "Forbidden: tenant mismatch" },
        { status: 403 },
      ),
    };
  }

  // For tenant users (OWNER/ADMIN/STAFF): trust JWT isAdmin flag.
  // isAdmin is computed at login time from TenantUser.role and embedded in the token.
  // No DB round-trip needed — all roles are verified at token issuance.
  if (!isSuperAdmin && !decoded.isAdmin) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Nemate administratorska prava" },
        { status: 403 },
      ),
    };
  }

  return { success: true, decoded };
}

/**
 * Guard za opštu autentifikaciju (bilo koji korisnik).
 */
export function requireAuth(
  request: NextRequest,
): { decoded: DecodedToken } | NextResponse {
  const decoded = getDecodedFromRequest(request);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Observe-only: log mismatches but never block — requireAuth is used on
  // client routes where tenant context is informational, not a hard gate.
  assertTenantMatch(decoded, request.headers.get("x-tenant-id") ?? "", request.url);
  return { decoded };
}

/**
 * Guard za superadmin API rute.
 */
export function requireSuperAdmin(
  request: NextRequest,
): { decoded: DecodedToken } | NextResponse {
  const decoded = getDecodedFromRequest(request);
  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!decoded.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { decoded };
}

export function isTenantActive(tenant: ITenant | null): boolean {
  if (!tenant) return true;
  return tenant.paid && tenant.verified && tenant.status === "active";
}
