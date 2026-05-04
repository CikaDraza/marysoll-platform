// src/proxy.ts
/**
 * proxy.ts — Multi-tenant Next.js middleware
 *
 * Security responsibilities:
 *  1. Resolves tenant from subdomain / custom-domain / path segment.
 *  2. Injects x-tenant-slug and x-tenant-id into every request.
 *  3. Guards protected routes (admin / superadmin / client).
 *  4. Validates tenant tokens: if token.type === "tenant", the token's
 *     tenantId MUST match the resolved tenant's DB id (cross-tenant leakage guard).
 *     Token/id mismatch returns 401 immediately.
 *
 * Security boundary: tenantId (DB _id) — never slug alone.
 * Slug is used only for routing and display; tenantId is the trust anchor.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

interface DecodedToken {
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
interface AuthOut {
  refreshedCookie?: { name: string; value: string };
}

type DomainType = "marketing" | "admin" | "superadmin" | "client";

const IS_PROD = process.env.NODE_ENV === "production";
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
const CUSTOM_CLIENT_DOMAIN = process.env.CUSTOM_CLIENT_DOMAIN ?? null;

/** Returns true when the request host is a fully custom domain (not *.marysoll.com or localhost). */
function isCustomDomain(hostname: string, baseDomain: string): boolean {
  const host = hostname.split(":")[0];
  return (
    host !== "localhost" &&
    !host.startsWith("127.") &&
    !host.endsWith(baseDomain) &&
    host !== baseDomain
  );
}

const ADMIN_PROTECTED_API_ROUTES = [
  "/api/services/create",
  "/api/services",
  "/api/appointments",
  "/api/appointments/search",
  "/api/testimonials",
  "/api/testimonials/delete",
  "/api/testimonials/update",
  "/api/testimonials/mark-read",
  "/api/salon-profile/create",
  "/api/salon-profile/update",
  "/api/salon-profile/delete",
  "/api/salon-profile/update-seo",
  "/api/notifications",
  "/api/newsletter/templates",
  "/api/newsletter/campaigns",
  "/api/users",
  "/api/cloudinary",
  "/api/statistics",
  "/api/tenants/identity",
  "/api/tenants/update",
  "/api/subscriptions",
];

const SUPERADMIN_API_ROUTES = [
  "/api/superadmin",
  "/api/tenants/delete",
  "/api/plans",
];

const CLIENT_PROTECTED_API_ROUTES = [
  "/api/appointments/create",
  "/api/testimonials/create",
  "/api/users/me",
];

const RESERVED_TOP_SEGMENTS = new Set([
  "dashboard",
  "superadmin",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify-email",
  "resend-verification",
  "api",
  "_next",
  "favicon.ico",
  "newsletter",
  "privacy",
  "terms",
  "unauthorized",
  "logout",
  "tenant", // internal route prefix — must never be treated as a tenant slug
  "marketing",
]);

// ─── Custom domain DB lookup ──────────────────────────────────────────────────
/** Caches custom-domain → { slug, id } resolutions (5-min TTL). */
const domainCache = new Map<
  string,
  { slug: string | null; id: string | null; ts: number }
>();

/** Caches subdomain slug → tenantId resolutions (5-min TTL). */
const tenantIdCache = new Map<string, { id: string; ts: number }>();

const CACHE_TTL = 5 * 60 * 1000;

async function resolveCustomDomain(
  request: NextRequest,
  host: string,
): Promise<{ slug: string; id: string } | null> {
  const cached = domainCache.get(host);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.slug && cached.id ? { slug: cached.slug, id: cached.id } : null;
  }

  try {
    const url = new URL("/api/internal/resolve-domain", request.nextUrl.origin);
    url.searchParams.set("domain", host);
    const res = await fetch(url.toString(), {
      headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
    });
    if (!res.ok) {
      domainCache.set(host, { slug: null, id: null, ts: Date.now() });
      return null;
    }

    const data = await res.json();
    const slug = data.slug ?? null;
    const id = data.id ?? null;
    domainCache.set(host, { slug, id, ts: Date.now() });
    return slug && id ? { slug, id } : null;
  } catch {
    console.error("🔍 Error resolving custom domain:", host);
    return null;
  }
}

/**
 * Resolves the DB tenantId (_id) for a given tenant slug.
 * Used for subdomain routing where the slug comes from the hostname,
 * not a DB lookup.
 */
async function resolveSlugToTenantId(
  request: NextRequest,
  slug: string,
): Promise<string | null> {
  const cached = tenantIdCache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.id;
  }

  try {
    const url = new URL("/api/internal/resolve-tenant", request.nextUrl.origin);
    url.searchParams.set("slug", slug);
    const res = await fetch(url.toString(), {
      headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const id = data.id ?? null;
    if (id) tenantIdCache.set(slug, { id, ts: Date.now() });
    return id;
  } catch {
    console.error("🔍 Error resolving tenant slug:", slug);
    return null;
  }
}

// ─── Domain detection ─────────────────────────────────────────────────────────
async function detectDomainType(
  request: NextRequest,
  hostname: string,
): Promise<{ type: DomainType; tenantSlug: string | null; tenantId: string | null }> {
  const host = hostname.split(":")[0];

  // 1. Base domain (marketing)
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) {
    return { type: "marketing", tenantSlug: null, tenantId: null };
  }

  // 2. Admin subdomains
  if (host === `admin.${BASE_DOMAIN}`) {
    return { type: "admin", tenantSlug: null, tenantId: null };
  }

  if (host === `superadmin.${BASE_DOMAIN}`) {
    return { type: "superadmin", tenantSlug: null, tenantId: null };
  }

  // 3. Wildcard subdomains (tenant subdomain)
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1));
    if (!["admin", "superadmin", "app", "www"].includes(subdomain)) {
      const tenantId = await resolveSlugToTenantId(request, subdomain);
      return { type: "client", tenantSlug: subdomain, tenantId };
    }
  }

  // 4. Custom domain — check env var first, then DB
  if (host !== "localhost" && !host.endsWith(BASE_DOMAIN)) {
    if (CUSTOM_CLIENT_DOMAIN && host === CUSTOM_CLIENT_DOMAIN) {
      const resolved = await resolveCustomDomain(request, host);
      if (resolved) return { type: "client", tenantSlug: resolved.slug, tenantId: resolved.id };
      return { type: "client", tenantSlug: null, tenantId: null };
    }

    const resolved = await resolveCustomDomain(request, host);
    if (resolved) return { type: "client", tenantSlug: resolved.slug, tenantId: resolved.id };

    return { type: "client", tenantSlug: null, tenantId: null };
  }

  // 5. LOCALHOST
  if (!IS_PROD && host.startsWith("localhost")) {
    const devType = process.env.DEV_DOMAIN_TYPE as DomainType | undefined;
    if (devType === "admin") return { type: "admin", tenantSlug: null, tenantId: null };
    if (devType === "superadmin") return { type: "superadmin", tenantSlug: null, tenantId: null };
    if (devType === "client") {
      const slug = process.env.DEV_TENANT_SLUG ?? "default";
      const tenantId = slug !== "default" ? await resolveSlugToTenantId(request, slug) : null;
      return { type: "client", tenantSlug: slug, tenantId };
    }
    return { type: "marketing", tenantSlug: null, tenantId: null };
  }

  return { type: "client", tenantSlug: null, tenantId: null };
}

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
    return attemptRefresh(request, "tenant-refresh-token", tenantRefresh, "/api/tenant-auth/refresh");
  }
  if (platformRefresh) {
    return attemptRefresh(request, "platform-refresh-token", platformRefresh, "/api/auth/refresh");
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
      headers: { Cookie: `${cookieName}=${cookieValue}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

/** Applies a refreshed token cookie to a response. */
function applyRefreshedCookie(response: NextResponse, out: AuthOut): void {
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

async function guardApi(
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
    const cookieName = decoded.type === "tenant" ? "tenant-access-token" : "platform-access-token";
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

async function guardPage(
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
    const cookieName = decoded.type === "tenant" ? "tenant-access-token" : "platform-access-token";
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

// ─── Main middleware ──────────────────────────────────────────────────────────
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  // Vercel Cron bypass
  if (
    pathname === "/api/newsletter/campaigns/scheduler" &&
    request.headers.get("x-vercel-cron")
  ) {
    return NextResponse.next();
  }

  // Internal API bypass
  if (pathname.startsWith("/api/internal/")) {
    const secret = request.headers.get("x-internal-secret");
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  let { type: domainType, tenantSlug, tenantId } = await detectDomainType(request, hostname);

  // Path-based tenant routing (marysoll.com/[slug] or localhost/[slug] — dev only)
  const isMarketingOrLocalhost =
    domainType === "marketing" ||
    (!IS_PROD && hostname.split(":")[0].startsWith("localhost"));

  // wasPathBasedDev: true when the slug came from the URL path on localhost (not from env/subdomain)
  let wasPathBasedDev = false;

  if (isMarketingOrLocalhost) {
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0] ?? "";
    if (
      firstSegment.length > 0 &&
      !RESERVED_TOP_SEGMENTS.has(firstSegment) &&
      /^[a-z0-9-]+$/.test(firstSegment)
    ) {
      domainType = "client";
      tenantSlug = firstSegment;
      if (!tenantId) {
        tenantId = await resolveSlugToTenantId(request, firstSegment);
      }
      wasPathBasedDev = !IS_PROD && hostname.split(":")[0].startsWith("localhost");
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-domain-type", domainType);
  requestHeaders.set("x-tenant-slug", tenantSlug ?? "");
  requestHeaders.set("x-tenant-id", tenantId ?? "");
  // x-tenant-base-path: used by the tenant layout to set the client-side navigation base.
  // Empty on prod/subdomain (URLs are root-relative); "/{slug}" on localhost path-based dev.
  requestHeaders.set("x-tenant-base-path", wasPathBasedDev ? `/${tenantSlug}` : "");

  const pass = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  // Block direct browser access to the internal /tenant/* route on non-client domains.
  if (
    (pathname === "/tenant" || pathname.startsWith("/tenant/")) &&
    domainType !== "client"
  ) {
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  // Public API — always pass
  if (pathname.startsWith("/api/public/")) return pass();

  // tenant-auth routes are always public (they ARE the auth endpoints)
  if (pathname.startsWith("/api/tenant-auth/")) return pass();

  // SuperAdmin
  if (
    domainType === "superadmin" ||
    SUPERADMIN_API_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    if (!pathname.startsWith("/auth/callback")) {
      const authCtx: AuthOut = {};
      const fail = pathname.startsWith("/api/")
        ? await guardApi(request, null, false, true, authCtx)
        : await guardPage(request, null, false, true, authCtx);
      if (fail) return fail;
      const res = pass();
      applyRefreshedCookie(res, authCtx);
      return res;
    }
    return pass();
  }

  // Admin
  if (domainType === "admin") {
    if (pathname.startsWith("/api/")) {
      if (ADMIN_PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r))) {
        const authCtx: AuthOut = {};
        const fail = await guardApi(request, tenantId, true, false, authCtx);
        if (fail) return fail;
        const res = pass();
        applyRefreshedCookie(res, authCtx);
        return res;
      }
    }
    return pass();
  }

  // Marketing
  if (domainType === "marketing") return pass();

  // Client — rewrite to /tenant/* (single source of truth for tenant routing)
  if (domainType === "client") {
    // Block immediately if tenant couldn't be resolved — slug without a valid DB id is a security gap
    if (tenantId === null) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }

    const host = hostname.split(":")[0];
    const PLATFORM_SUBDOMAINS = new Set(["admin", "superadmin", "app", "www"]);
    const isTenantSubdomain =
      host.endsWith(`.${BASE_DOMAIN}`) &&
      !PLATFORM_SUBDOMAINS.has(host.slice(0, -(BASE_DOMAIN.length + 1)));
    const isHostBased = isCustomDomain(hostname, BASE_DOMAIN) || isTenantSubdomain;

    // In production, path-based tenant routing (marysoll.com/slug/...) is NOT supported.
    if (IS_PROD && !isHostBased) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }

    const CLIENT_TENANT_PATHS = new Set([
      "/login",
      "/register",
      "/panel",
      "/termini",
      "/usluge",
      "/forgot-password",
      "/resend-verification",
      "/cookie-policy",
      "/pravila-privatnosti",
      "/politika-privatnosti",
      "/pravila-zakazivanja",
      "/newsletter",
    ]);

    // PRODUCTION: subdomain or custom domain — rewrite /path → /tenant/path
    if (tenantSlug && isHostBased) {
      const matchesClientPath =
        CLIENT_TENANT_PATHS.has(pathname) ||
        [...CLIENT_TENANT_PATHS].some((p) => pathname.startsWith(p + "/"));

      if (matchesClientPath || pathname === "/") {
        const internalPath = pathname === "/" ? "/tenant" : `/tenant${pathname}`;
        const rewriteUrl = new URL(internalPath, request.nextUrl.origin);
        rewriteUrl.search = request.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        });
      }
    }

    // DEV (localhost path-based): strip slug, rewrite /{slug}/path → /tenant/path
    if (tenantSlug && wasPathBasedDev) {
      const segments = pathname.split("/").filter(Boolean);
      const pathAfterSlug = segments.slice(1).join("/");
      const restPath = pathAfterSlug ? `/${pathAfterSlug}` : "";

      const matchesAfterSlug =
        CLIENT_TENANT_PATHS.has(restPath) ||
        [...CLIENT_TENANT_PATHS].some((p) => restPath.startsWith(p + "/"));

      if (matchesAfterSlug || restPath === "") {
        const internalPath = restPath ? `/tenant${restPath}` : "/tenant";
        const rewriteUrl = new URL(internalPath, request.nextUrl.origin);
        rewriteUrl.search = request.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        });
      }
    }

    const authCtx: AuthOut = {};
    if (
      pathname.startsWith("/api/") &&
      CLIENT_PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r))
    ) {
      const fail = await guardApi(request, tenantId, false, false, authCtx);
      if (fail) return fail;
    }
    const res = pass();
    applyRefreshedCookie(res, authCtx);
    return res;
  }

  return pass();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.ico|service-worker\\.js).*)",
  ],
};
