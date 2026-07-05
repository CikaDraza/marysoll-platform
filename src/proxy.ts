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
type TenantResolution = {
  slug: string;
  id: string;
  customDomain: string | null;
};

const IS_PROD = process.env.NODE_ENV === "production";
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
const CUSTOM_CLIENT_DOMAIN = process.env.CUSTOM_CLIENT_DOMAIN ?? null;

/** Returns true when the request host is a fully custom domain (not *.marysoll.com or localhost). */
function isCustomDomain(hostname: string, baseDomain: string): boolean {
  const host = hostname.split(":")[0];
  return (
    host !== "localhost" &&
    !host.startsWith("127.") &&
    host !== baseDomain &&
    !host.endsWith(`.${baseDomain}`)
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
  "/api/appointments/client",
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
  "checkout",
  "api",
  "_next",
  "favicon.ico",
  "newsletter",
  "privacy",
  "Pronađi termin",
  "terms-and-conditions",
  "refund",
  "pricing",
  "kontakt",
  "booking",
  "unauthorized",
  "logout",
  "tenant", // internal route prefix — must never be treated as a tenant slug
  "marketing",
  "assets", // static public assets folder
  "dijagnostika", // samouslužna mrežna dijagnostika (/dijagnostika)
]);

// ─── Custom domain DB lookup ──────────────────────────────────────────────────
/** Caches custom-domain → { slug, id } resolutions (5-min TTL). */
const domainCache = new Map<
  string,
  {
    slug: string | null;
    id: string | null;
    customDomain: string | null;
    ts: number;
  }
>();

/** Caches subdomain slug → tenantId resolutions (5-min TTL). */
const tenantCache = new Map<
  string,
  { id: string; customDomain: string | null; ts: number }
>();

const CACHE_TTL = 5 * 60 * 1000;

async function resolveCustomDomain(
  request: NextRequest,
  host: string,
): Promise<TenantResolution | null> {
  const cached = domainCache.get(host);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.slug && cached.id
      ? { slug: cached.slug, id: cached.id, customDomain: cached.customDomain }
      : null;
  }

  try {
    const url = new URL("/api/internal/resolve-domain", request.nextUrl.origin);
    url.searchParams.set("domain", host);
    const res = await fetch(url.toString(), {
      headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
    });
    if (!res.ok) {
      domainCache.set(host, {
        slug: null,
        id: null,
        customDomain: null,
        ts: Date.now(),
      });
      return null;
    }

    const data = await res.json();
    const slug = data.slug ?? null;
    const id = data.id ?? null;
    const customDomain = data.customDomain ?? null;
    domainCache.set(host, { slug, id, customDomain, ts: Date.now() });
    return slug && id ? { slug, id, customDomain } : null;
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
): Promise<TenantResolution | null> {
  const cached = tenantCache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { slug, id: cached.id, customDomain: cached.customDomain };
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
    const resolvedSlug = data.slug ?? slug;
    const customDomain = data.customDomain ?? null;
    if (id) tenantCache.set(slug, { id, customDomain, ts: Date.now() });
    return id ? { slug: resolvedSlug, id, customDomain } : null;
  } catch {
    console.error("🔍 Error resolving tenant slug:", slug);
    return null;
  }
}

// ─── Domain detection ─────────────────────────────────────────────────────────
async function detectDomainType(
  request: NextRequest,
  hostname: string,
): Promise<{
  type: DomainType;
  tenantSlug: string | null;
  tenantId: string | null;
  customDomain: string | null;
}> {
  const host = hostname.split(":")[0].toLowerCase();

  // 1. Base domain (marketing)
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) {
    return {
      type: "marketing",
      tenantSlug: null,
      tenantId: null,
      customDomain: null,
    };
  }

  // 2. Vercel preview buildovi (grana → xxx.vercel.app): tretiraj kao marketing
  // da preview uopšte radi — inače bi pao u custom-domain granu, tenant lookup
  // bi omašio i SVE bi vraćalo 404. Marketing tip propušta i /dashboard i API
  // rute, pa se admin flow može testirati path-based (kao na localhost-u).
  if (host.endsWith(".vercel.app")) {
    return {
      type: "marketing",
      tenantSlug: null,
      tenantId: null,
      customDomain: null,
    };
  }

  // 3. Admin subdomains
  if (host === `admin.${BASE_DOMAIN}`) {
    return {
      type: "admin",
      tenantSlug: null,
      tenantId: null,
      customDomain: null,
    };
  }

  if (host === `superadmin.${BASE_DOMAIN}`) {
    return {
      type: "superadmin",
      tenantSlug: null,
      tenantId: null,
      customDomain: null,
    };
  }

  // 4. Wildcard subdomains (tenant subdomain)
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1));
    if (!["admin", "superadmin", "app", "www"].includes(subdomain)) {
      const tenantId = await resolveSlugToTenantId(request, subdomain);
      return {
        type: "client",
        tenantSlug: tenantId?.slug ?? subdomain,
        tenantId: tenantId?.id ?? null,
        customDomain: tenantId?.customDomain ?? null,
      };
    }
  }

  // 5. Custom domain — check env var first, then DB
  if (isCustomDomain(host, BASE_DOMAIN)) {
    if (CUSTOM_CLIENT_DOMAIN && host === CUSTOM_CLIENT_DOMAIN) {
      const resolved = await resolveCustomDomain(request, host);
      if (resolved) {
        return {
          type: "client",
          tenantSlug: resolved.slug,
          tenantId: resolved.id,
          customDomain: resolved.customDomain,
        };
      }
      return {
        type: "client",
        tenantSlug: null,
        tenantId: null,
        customDomain: null,
      };
    }

    const resolved = await resolveCustomDomain(request, host);
    if (resolved) {
      return {
        type: "client",
        tenantSlug: resolved.slug,
        tenantId: resolved.id,
        customDomain: resolved.customDomain,
      };
    }

    return {
      type: "client",
      tenantSlug: null,
      tenantId: null,
      customDomain: null,
    };
  }

  // 5. LOCALHOST
  if (!IS_PROD && host.startsWith("localhost")) {
    const devType = process.env.DEV_DOMAIN_TYPE as DomainType | undefined;
    if (devType === "admin")
      return {
        type: "admin",
        tenantSlug: null,
        tenantId: null,
        customDomain: null,
      };
    if (devType === "superadmin")
      return {
        type: "superadmin",
        tenantSlug: null,
        tenantId: null,
        customDomain: null,
      };
    if (devType === "client") {
      const slug = process.env.DEV_TENANT_SLUG ?? "default";
      const tenantId =
        slug !== "default" ? await resolveSlugToTenantId(request, slug) : null;
      return {
        type: "client",
        tenantSlug: tenantId?.slug ?? slug,
        tenantId: tenantId?.id ?? null,
        customDomain: tenantId?.customDomain ?? null,
      };
    }
    return {
      type: "marketing",
      tenantSlug: null,
      tenantId: null,
      customDomain: null,
    };
  }

  // Unrecognized host — log so we can diagnose unexpected cold-start 404s
  console.error(
    JSON.stringify({
      event: "PROXY_UNKNOWN_HOST_FALLBACK",
      host,
      BASE_DOMAIN,
      timestamp: new Date().toISOString(),
    }),
  );
  return {
    type: "client",
    tenantSlug: null,
    tenantId: null,
    customDomain: null,
  };
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

  let {
    type: domainType,
    tenantSlug,
    tenantId,
    customDomain,
  } = await detectDomainType(request, hostname);

  // Path-based tenant routing (marysoll.com/[slug] or localhost/[slug] — dev only)
  const isMarketingOrLocalhost =
    domainType === "marketing" ||
    (!IS_PROD && hostname.split(":")[0].startsWith("localhost"));

  // isPathBasedHost: slug je došao iz URL putanje (ne iz subdomena/custom
  // domena) — localhost dev ILI Vercel preview build (*.vercel.app nema
  // tenant subdomene, pa se tenant sajtovi testiraju kao /{slug}/...).
  let isPathBasedHost = false;

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
      const resolvedTenant = await resolveSlugToTenantId(request, firstSegment);
      tenantId = resolvedTenant?.id ?? null;
      customDomain = resolvedTenant?.customDomain ?? null;
      const bareHost = hostname.split(":")[0].toLowerCase();
      isPathBasedHost =
        (!IS_PROD && bareHost.startsWith("localhost")) ||
        bareHost.endsWith(".vercel.app");
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-domain-type", domainType);
  requestHeaders.set("x-tenant-slug", tenantSlug ?? "");
  requestHeaders.set("x-tenant-id", tenantId ?? "");
  // x-tenant-base-path: used by the tenant layout to set the client-side navigation base.
  // Empty on prod/subdomain (URLs are root-relative); "/{slug}" on path-based
  // hosts (localhost dev i Vercel preview).
  requestHeaders.set(
    "x-tenant-base-path",
    isPathBasedHost ? `/${tenantSlug}` : "",
  );

  const pass = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  // Tenant-aware favicon: browser gađa /favicon.ico direktno (bez tenant metadata),
  // pa bi inače dobio statički platform favicon. Za client domene prosledi tenant
  // resolveru; sve ostalo (marketing/admin/superadmin) pada na statički favicon.
  if (pathname === "/favicon.ico") {
    if (domainType === "client" && tenantId) {
      return NextResponse.rewrite(
        new URL("/tenant/favicon", request.nextUrl.origin),
        { request: { headers: requestHeaders } },
      );
    }
    return pass();
  }

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

  // Paddle webhook — public, self-verifies via signature; reachable from any host
  // (Paddle servers, tunnel za lokalni test, itd.)
  if (pathname.startsWith("/api/paddle/webhook")) return pass();

  // Browser-reset — javan sa svakog hosta: samo čisti kolačiće/keš pozivaoca
  // (Clear-Site-Data) i mora da radi i kad je auth stanje pokvareno/obrisano,
  // što mu je i svrha — klijentski helper prvo obriše tokene pa tek onda dođe ovde
  if (pathname.startsWith("/api/browser-reset")) return pass();

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

    const host = hostname.split(":")[0].toLowerCase();
    const PLATFORM_SUBDOMAINS = new Set(["admin", "superadmin", "app", "www"]);
    const isTenantSubdomain =
      host.endsWith(`.${BASE_DOMAIN}`) &&
      !PLATFORM_SUBDOMAINS.has(host.slice(0, -(BASE_DOMAIN.length + 1)));
    const isHostBased =
      isCustomDomain(hostname, BASE_DOMAIN) || isTenantSubdomain;

    // SEO canonicalization: once a tenant has a verified custom domain,
    // permanently redirect the old subdomain to preserve ranking signals.
    if (
      customDomain &&
      isHostBased &&
      host !== customDomain &&
      !pathname.startsWith("/api/")
    ) {
      const canonicalUrl = request.nextUrl.clone();
      canonicalUrl.protocol = "https:";
      canonicalUrl.host = customDomain;
      return NextResponse.redirect(canonicalUrl, 301);
    }

    // In production, path-based tenant routing (marysoll.com/slug/...) is NOT supported.
    // Izuzetak: Vercel preview buildovi (*.vercel.app) nemaju tenant subdomene,
    // pa se tenant sajtovi testiraju path-based kao na localhost-u.
    const isVercelPreview = host.endsWith(".vercel.app");
    if (IS_PROD && !isHostBased && !isVercelPreview) {
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
      "/blogs",
    ]);

    // PRODUCTION: subdomain or custom domain — rewrite /path → /tenant/path
    if (tenantSlug && isHostBased) {
      if (pathname === "/blog" || pathname.startsWith("/blog/")) {
        const rewriteUrl = new URL(
          `/tenant/blogs${pathname}`,
          request.nextUrl.origin,
        );
        rewriteUrl.search = request.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        });
      }

      const matchesClientPath =
        CLIENT_TENANT_PATHS.has(pathname) ||
        [...CLIENT_TENANT_PATHS].some((p) => pathname.startsWith(p + "/"));

      if (matchesClientPath || pathname === "/") {
        const internalPath =
          pathname === "/" ? "/tenant" : `/tenant${pathname}`;
        const rewriteUrl = new URL(internalPath, request.nextUrl.origin);
        rewriteUrl.search = request.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        });
      }
    }

    // PATH-BASED (localhost dev + Vercel preview): strip slug,
    // rewrite /{slug}/path → /tenant/path
    if (tenantSlug && isPathBasedHost) {
      const segments = pathname.split("/").filter(Boolean);
      const pathAfterSlug = segments.slice(1).join("/");
      const restPath = pathAfterSlug ? `/${pathAfterSlug}` : "";

      if (restPath === "/blog" || restPath.startsWith("/blog/")) {
        const rewriteUrl = new URL(
          `/tenant/blogs${restPath}`,
          request.nextUrl.origin,
        );
        rewriteUrl.search = request.nextUrl.search;
        return NextResponse.rewrite(rewriteUrl, {
          request: { headers: requestHeaders },
        });
      }

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
    // NOTE: favicon.ico i .ico NISU isključeni — proxy ih presreće da bi servirao
    // tenant-specifičan favicon (vidi rewrite iznad). Ostali statički fajlovi ostaju out.
    "/((?!_next/static|_next/image|assets/|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.gif|.*\\.svg|.*\\.mp4|.*\\.webm|.*\\.ogg|.*\\.mp3|service-worker\\.js).*)",
  ],
};
