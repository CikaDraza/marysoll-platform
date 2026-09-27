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
import { TenantUser } from "@/models/TenantUser";
import type { ITenant } from "@/models/Tenant";
import { DecodedToken } from "@/types/auth/types";
import { assertTenantMatch } from "@/lib/audit/tenant-guard";
import {
  asTenantRole,
  isBackofficeRole,
  isBusinessAdminRole,
  isOwnerRole,
  isSalonOperatorRole,
  type TenantRole,
} from "./roles";

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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as DecodedToken;
    // Legacy STAFF tokeni su izdati sa isAdmin=true. Dok ne isteknu, svaki
    // postojeci direktni potrosac verifyToken-a mora ipak dobiti novu
    // semantiku: globalRole je merodavan, STAFF nikad nije business admin.
    if (
      decoded.type === "tenant" &&
      asTenantRole(decoded.globalRole) != null
    ) {
      decoded.isAdmin = isBusinessAdminRole(decoded.globalRole);
    }
    return decoded;
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

function getDecodedFromRequest(
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

export interface TenantAuthorityMembership {
  id: string;
  tenantId: string;
  role: TenantRole;
}

export type AdminAuthResult =
  | {
      success: true;
      decoded: DecodedToken;
      membership: TenantAuthorityMembership | null;
    }
  | { success: false; response: NextResponse };

type TenantAuthority =
  | "backoffice"
  | "admin"
  | "owner"
  | "operator";

function authError(
  status: 401 | 403,
  error: string,
  code: string,
): AdminAuthResult {
  return {
    success: false,
    response: NextResponse.json({ error, code }, { status }),
  };
}

function roleAllows(authority: TenantAuthority, role: TenantRole): boolean {
  if (authority === "owner") return isOwnerRole(role);
  if (authority === "admin") return isBusinessAdminRole(role);
  if (authority === "operator") return isSalonOperatorRole(role);
  return isBackofficeRole(role);
}

/**
 * Server authority uvek ponovo cita trenutno TenantUser clanstvo.
 *
 * JWT dokazuje identitet i tenant kontekst, ali ne trenutnu ulogu/status.
 * Suspendovan ili demotovan clan zato gubi write pristup odmah, bez cekanja
 * da 30-dnevni token istekne.
 */
async function requireTenantAuthority(
  request: Request,
  authority: TenantAuthority,
): Promise<AdminAuthResult> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return authError(401, "Neautorizovan pristup", "UNAUTHENTICATED");
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return authError(
      401,
      "Nevažeći ili istekao token",
      "INVALID_TOKEN",
    );
  }

  // Cross-check: token's tenantId must match the tenantId resolved by proxy.
  // SUPER_ADMIN is exempt — they operate across all tenants.
  const isSuperAdmin = decoded.isSuperAdmin ?? false;
  const requestTenantId = request.headers.get("x-tenant-id") ?? "";
  const tokenTenantId = decoded.tenantId ?? "";

  if (requestTenantId !== "" && !isSuperAdmin && tokenTenantId !== requestTenantId) {
    // Log the mismatch via the audit utility before rejecting.
    assertTenantMatch(decoded, requestTenantId, request.url);
    return authError(403, "Forbidden: tenant mismatch", "TENANT_MISMATCH");
  }

  // Platform superadmin zadrzava postojeci bypass za backoffice/admin/operator
  // rute. Owner je tenant clanstvo i ne moze se glumiti platformskom rolom.
  if (isSuperAdmin) {
    if (authority === "owner") {
      return authError(
        403,
        "Samo vlasnik salona može izvršiti ovu radnju.",
        "OWNER_REQUIRED",
      );
    }
    return { success: true, decoded, membership: null };
  }

  const tenantUserId = decoded.tenantUserId;
  const tenantId = decoded.tenantId;
  if (!tenantUserId || !tenantId || decoded.type !== "tenant") {
    return authError(
      403,
      "Nedostaje aktivan tenant kontekst.",
      "TENANT_CONTEXT_REQUIRED",
    );
  }

  await connectToDB();
  const member = await TenantUser.findOne({
    _id: tenantUserId,
    tenantId,
    status: "active",
  })
    .select("_id tenantId role")
    .lean<{ _id: { toString(): string }; tenantId: { toString(): string }; role: unknown }>();

  const role = asTenantRole(member?.role);
  if (!member || !role) {
    return authError(
      403,
      "Članstvo nije aktivno.",
      "MEMBERSHIP_INACTIVE",
    );
  }

  if (!roleAllows(authority, role)) {
    return authError(
      403,
      role === "STAFF" && authority === "admin"
        ? "Nemate dozvolu za izmenu ovog dela salona."
        : authority === "owner"
          ? "Samo vlasnik salona može izvršiti ovu radnju."
          : "Nemate potrebna ovlašćenja.",
      role === "STAFF" && authority === "admin"
        ? "STAFF_READ_ONLY"
        : authority === "owner"
          ? "OWNER_REQUIRED"
          : "ROLE_FORBIDDEN",
    );
  }

  const currentDecoded: DecodedToken = {
    ...decoded,
    globalRole: role,
    isAdmin: isBusinessAdminRole(role),
    tenantId: String(member.tenantId),
    tenantUserId: String(member._id),
  };

  return {
    success: true,
    decoded: currentDecoded,
    membership: {
      id: String(member._id),
      tenantId: String(member.tenantId),
      role,
    },
  };
}

/** OWNER / ADMIN — poslovna konfiguracija i svakodnevni management. */
export function requireAdmin(request: Request): Promise<AdminAuthResult> {
  return requireTenantAuthority(request, "admin");
}

/** OWNER / ADMIN / STAFF — ulazak u backoffice, bez implicitnog write prava. */
export function requireBackofficeMember(
  request: Request,
): Promise<AdminAuthResult> {
  return requireTenantAuthority(request, "backoffice");
}

/** OWNER — owner-sensitive i destruktivne operacije. */
export function requireOwner(request: Request): Promise<AdminAuthResult> {
  return requireTenantAuthority(request, "owner");
}

/** OWNER / ADMIN / STAFF — isključivo appointment/client operativne komande. */
export function requireSalonOperator(
  request: Request,
): Promise<AdminAuthResult> {
  return requireTenantAuthority(request, "operator");
}

/**
 * Tenant-scoped extension of requireAdmin for routes that must never fall back
 * to an arbitrary profile when a superadmin token has no tenant context.
 */
export type TenantAdminAuthResult =
  | { success: true; tenantId: string }
  | { success: false; response: NextResponse };

export async function requireTenantAdmin(
  request: Request,
): Promise<TenantAdminAuthResult> {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth;

  const { tenantId } = auth.decoded;
  if (!tenantId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Nedostaje kontekst naloga.", code: "TENANT_CONTEXT_REQUIRED" },
        { status: 403 },
      ),
    };
  }

  return { success: true, tenantId };
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
