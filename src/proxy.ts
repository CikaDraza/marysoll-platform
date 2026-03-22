/**
 * proxy.ts — Multi-tenant Next.js middleware
 *
 * ┌─────────────────────────────────┬─────────────┬──────────────────────────────┐
 * │ URL Pattern                     │ Type        │ Notes                        │
 * ├─────────────────────────────────┼─────────────┼──────────────────────────────┤
 * │ marysoll.com                    │ marketing   │ Public landing               │
 * │ admin.marysoll.com              │ admin       │ Salon owner panel            │
 * │ superadmin.marysoll.com         │ superadmin  │ Platform admin               │
 * │ kikikiss.beauty (custom domain) │ client      │ 1 custom domain (Vercel Free)│
 * │ marysoll.com/[tenantSlug]       │ client      │ Path-based (no wildcard DNS) │
 * │ localhost:PORT/[tenantSlug]     │ client      │ Dev path-based routing       │
 * └─────────────────────────────────┴─────────────┴──────────────────────────────┘
 *
 * NOTE — Vercel Free plan:
 *   ❌ *.marysoll.com  (wildcard subdomains NOT available)
 *   ✅ marysoll.com, admin.marysoll.com, superadmin.marysoll.com (exact subdomains)
 *   ✅ 1 custom domain (e.g. kikikiss.beauty)
 *   ✅ marysoll.com/[tenantSlug] — path-based multi-tenancy (primary strategy)
 *
 * Injected request headers:
 *   x-domain-type  — "marketing" | "admin" | "superadmin" | "client"
 *   x-tenant-slug  — tenant slug string (or "")
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DecodedToken {
  id: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  tenantId?: string;
  exp: number;
}

type DomainType = "marketing" | "admin" | "superadmin" | "client";

// ─── Environment-aware constants ──────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === "production";

// Primary domain — read from env, fallback to marysoll.com
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

// Custom client domain (1 allowed on Vercel Free plan)
// Set CUSTOM_CLIENT_DOMAIN=kikikiss.beauty in Vercel env vars
const CUSTOM_CLIENT_DOMAIN = process.env.CUSTOM_CLIENT_DOMAIN ?? null;

// ─── Route protection lists ───────────────────────────────────────────────────

const ADMIN_PROTECTED_API_ROUTES = [
  "/api/services/create",
  "/api/services",
  "/api/appointments",
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
  "/api/tenants/update",
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

// Top-level path segments that are NOT tenant slugs
// Top-level segments that are definitively NOT tenant slugs.
// NOTE: "usluge", "termini", "panel" etc. are intentionally NOT here —
// they are sub-routes of /{tenantSlug}/ and handled by [tenantSlug] sub-pages.
const RESERVED_TOP_SEGMENTS = new Set([
  "dashboard",        // admin panel
  "superadmin",       // superadmin panel
  "login",            // global login
  "register",         // salon registration
  "forgot-password",  // password reset flow
  "reset-password",
  "verify-email",
  "resend-verification",
  "api",              // API routes
  "_next",            // Next.js internals
  "favicon.ico",
  "newsletter",       // newsletter landing pages
  "privacy",
  "terms",
  "unauthorized",
]);

// ─── Domain detection ─────────────────────────────────────────────────────────

function detectDomainType(
  hostname: string
): { type: DomainType; tenantSlug: string | null } {
  const host = hostname.split(":")[0]; // strip port

  // ── Exact domain matches ──────────────────────────────────────────────────
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) {
    return { type: "marketing", tenantSlug: null };
  }
  if (host === `admin.${BASE_DOMAIN}`) {
    return { type: "admin", tenantSlug: null };
  }
  if (host === `superadmin.${BASE_DOMAIN}`) {
    return { type: "superadmin", tenantSlug: null };
  }

  // ── Custom client domain (Vercel Free: 1 custom domain) ──────────────────
  if (CUSTOM_CLIENT_DOMAIN && host === CUSTOM_CLIENT_DOMAIN) {
    return { type: "client", tenantSlug: null }; // resolved via DB lookup
  }

  // ── Wildcard subdomains (only works on paid Vercel / custom infra) ────────
  // Kept for future use if upgrading plan
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1));
    if (!["admin", "superadmin", "app", "www"].includes(subdomain)) {
      return { type: "client", tenantSlug: subdomain };
    }
  }

  // ── localhost dev: override via .env.local ────────────────────────────────
  // DEV_DOMAIN_TYPE=admin|superadmin|client
  // DEV_TENANT_SLUG=my-salon   (used when DEV_DOMAIN_TYPE=client)
  if (!IS_PROD && (host === "localhost" || host.startsWith("localhost"))) {
    const devType = process.env.DEV_DOMAIN_TYPE as DomainType | undefined;
    if (devType === "admin")      return { type: "admin",      tenantSlug: null };
    if (devType === "superadmin") return { type: "superadmin", tenantSlug: null };
    if (devType === "client")     return { type: "client",     tenantSlug: process.env.DEV_TENANT_SLUG ?? "default" };
    // Default on localhost: marketing (path-based routing handles tenants below)
    return { type: "marketing", tenantSlug: null };
  }

  // ── Unknown host — treat as custom client domain (DB lookup by customDomain) ─
  return { type: "client", tenantSlug: null };
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return request.cookies.get("token")?.value ?? null;
}

function decodeToken(token: string): DecodedToken | null {
  try {
    const d = jwtDecode<DecodedToken>(token);
    return d.exp * 1000 > Date.now() ? d : null;
  } catch {
    return null;
  }
}

async function tryRefreshToken(request: NextRequest): Promise<string | null> {
  const refreshToken = request.cookies.get("refreshToken")?.value;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${request.nextUrl.origin}/api/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

// ─── Auth guards ──────────────────────────────────────────────────────────────

async function guardApi(
  request: NextRequest,
  needAdmin = false,
  needSuperAdmin = false
): Promise<NextResponse | null> {
  let token = getToken(request);
  let decoded = token ? decodeToken(token) : null;

  if (!decoded) {
    token = await tryRefreshToken(request);
    decoded = token ? decodeToken(token) : null;
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (needSuperAdmin && !decoded.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (needAdmin && !decoded.isAdmin && !decoded.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null; // ok
}

async function guardPage(
  request: NextRequest,
  needAdmin = false,
  needSuperAdmin = false
): Promise<NextResponse | null> {
  const loginUrl = new URL("/login", request.url);
  const unauthorizedUrl = new URL("/unauthorized", request.url);

  let token = getToken(request);
  let decoded = token ? decodeToken(token) : null;

  if (!decoded) {
    token = await tryRefreshToken(request);
    decoded = token ? decodeToken(token) : null;
    if (!decoded) return NextResponse.redirect(loginUrl);
  }

  if (needSuperAdmin && !decoded.isSuperAdmin) return NextResponse.redirect(unauthorizedUrl);
  if (needAdmin && !decoded.isAdmin && !decoded.isSuperAdmin) return NextResponse.redirect(unauthorizedUrl);
  return null; // ok
}

// ─── Main middleware ──────────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const hostname  = request.headers.get("host") ?? "";

  // ── Vercel Cron — bypass auth ────────────────────────────────────────────
  if (pathname === "/api/newsletter/campaigns/scheduler" && request.headers.get("x-vercel-cron")) {
    return NextResponse.next();
  }

  // ── Detect domain type ────────────────────────────────────────────────────
  let { type: domainType, tenantSlug } = detectDomainType(hostname);

  // ── Path-based tenant routing ────────────────────────────────────────────
  // Works on localhost (dev) AND on marysoll.com/[slug] (production with no wildcard)
  //
  // marysoll.com/kiki-makeup          → client "kiki-makeup"
  // marysoll.com/kiki-makeup/usluge   → client "kiki-makeup" (rest of path handled by Next.js)
  // localhost:3000/kiki-makeup        → client "kiki-makeup"
  const isMarketingHost = domainType === "marketing";
  const isLocalhostHost = !IS_PROD && hostname.startsWith("localhost");

  if (isMarketingHost || isLocalhostHost) {
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0] ?? "";

    if (
      firstSegment.length > 0 &&
      !RESERVED_TOP_SEGMENTS.has(firstSegment) &&
      /^[a-z0-9-]+$/.test(firstSegment)
    ) {
      domainType = "client";
      tenantSlug = firstSegment;
    }
  }

  // ── Inject headers ────────────────────────────────────────────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-domain-type", domainType);
  requestHeaders.set("x-tenant-slug", tenantSlug ?? "");
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

  // ── Public API routes — always pass through ──────────────────────────────
  if (pathname.startsWith("/api/public/")) {
    return pass();
  }

  // ── SuperAdmin ────────────────────────────────────────────────────────────
  if (domainType === "superadmin" || SUPERADMIN_API_ROUTES.some((r) => pathname.startsWith(r))) {
    const fail = pathname.startsWith("/api/")
      ? await guardApi(request, false, true)
      : await guardPage(request, false, true);
    if (fail) return fail;
    return pass();
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  if (domainType === "admin") {
    if (pathname.startsWith("/api/")) {
      if (ADMIN_PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r))) {
        const fail = await guardApi(request, true);
        if (fail) return fail;
      }
    } else if (!pathname.startsWith("/login") && !pathname.startsWith("/forgot-password")) {
      const fail = await guardPage(request, true);
      if (fail) return fail;
    }
    return pass();
  }

  // ── Marketing ─────────────────────────────────────────────────────────────
  if (domainType === "marketing") {
    return pass();
  }

  // ── Client (salon pages) ──────────────────────────────────────────────────
  if (domainType === "client") {
    if (pathname.startsWith("/api/") && CLIENT_PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r))) {
      const fail = await guardApi(request);
      if (fail) return fail;
    }
    return pass();
  }

  return pass();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.ico|service-worker\\.js).*)",
  ],
};
