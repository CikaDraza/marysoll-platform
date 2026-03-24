/**
 * proxy.ts — Multi-tenant Next.js middleware
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  id: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  tenantId?: string;
  exp: number;
}

type DomainType = "marketing" | "admin" | "superadmin" | "client";

const IS_PROD = process.env.NODE_ENV === "production";
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

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
]);

// ─── Custom domain DB lookup ──────────────────────────────────────────────────
const domainCache = new Map<string, { slug: string | null; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function resolveCustomDomain(
  request: NextRequest,
  host: string,
): Promise<string | null> {
  const cached = domainCache.get(host);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.slug;
  }

  try {
    const url = new URL("/api/internal/resolve-domain", request.nextUrl.origin);
    url.searchParams.set("domain", host);

    const res = await fetch(url.toString(), {
      headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
    });

    if (!res.ok) {
      domainCache.set(host, { slug: null, ts: Date.now() });
      return null;
    }

    const data = await res.json();
    const slug = data.slug ?? null;
    domainCache.set(host, { slug, ts: Date.now() });
    return slug;
  } catch {
    return null;
  }
}

// ─── Domain detection ─────────────────────────────────────────────────────────
async function detectDomainType(
  request: NextRequest,
  hostname: string,
): Promise<{ type: DomainType; tenantSlug: string | null }> {
  const host = hostname.split(":")[0];

  // 1. Base domain (marketing)
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) {
    return { type: "marketing", tenantSlug: null };
  }

  // 2. Admin subdomains
  if (host === `admin.${BASE_DOMAIN}`) {
    return { type: "admin", tenantSlug: null };
  }

  if (host === `superadmin.${BASE_DOMAIN}`) {
    return { type: "superadmin", tenantSlug: null };
  }

  // 3. Wildcard subdomains (kiki-makeup.marysoll.com)
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1));
    if (!["admin", "superadmin", "app", "www"].includes(subdomain)) {
      return { type: "client", tenantSlug: subdomain };
    }
  }

  // 4. Custom domain (kikikiss.beauty) - PRODUKCIJA
  // VAŽNO: Proveri custom domain BILO KOJI host koji nije BASE_DOMAIN
  if (host !== "localhost" && !host.endsWith(BASE_DOMAIN)) {
    const slug = await resolveCustomDomain(request, host);
    if (slug !== null) {
      return { type: "client", tenantSlug: slug };
    }
    // Ako ne nađeš u DB, vrati null ali ostavi kao client (može biti neki drugi domain)
    return { type: "client", tenantSlug: null };
  }

  // 5. LOCALHOST: Tretiraj kao marketing domain (path-based routing će se primeniti posle)
  if (!IS_PROD && host.startsWith("localhost")) {
    return { type: "marketing", tenantSlug: null };
  }

  // Fallback
  return { type: "client", tenantSlug: null };
}

// ─── Token helpers ────────────────────────────────────────────────────────────
function getToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);

  const authTokenCookie = request.cookies.get("auth-token")?.value;
  if (authTokenCookie) return authTokenCookie;

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
  needSuperAdmin = false,
): Promise<NextResponse | null> {
  let token = getToken(request);
  let decoded = token ? decodeToken(token) : null;
  if (!decoded) {
    token = await tryRefreshToken(request);
    decoded = token ? decodeToken(token) : null;
    if (!decoded)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (needSuperAdmin && !decoded.isSuperAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (needAdmin && !decoded.isAdmin && !decoded.isSuperAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

async function guardPage(
  request: NextRequest,
  needAdmin = false,
  needSuperAdmin = false,
): Promise<NextResponse | null> {
  const loginUrl = new URL(
    `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com"}/login`,
  );
  const unauthorizedUrl = new URL("/unauthorized", request.url);
  let token = getToken(request);
  let decoded = token ? decodeToken(token) : null;
  if (!decoded) {
    token = await tryRefreshToken(request);
    decoded = token ? decodeToken(token) : null;
    if (!decoded) return NextResponse.redirect(loginUrl);
  }
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

  // Detect domain type
  let { type: domainType, tenantSlug } = await detectDomainType(
    request,
    hostname,
  );

  // Path-based tenant routing (ZA MARKETING I LOCALHOST)
  // Ovo omogućava /kiki-makeup/panel da radi na localhost-u i marysoll.com
  const isMarketingOrLocalhost =
    domainType === "marketing" ||
    (!IS_PROD && hostname.startsWith("localhost"));

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
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-domain-type", domainType);
  requestHeaders.set("x-tenant-slug", tenantSlug ?? "");

  // DEBUG: Ukloni ovo posle testiranja
  console.log("🚀 Middleware:", { hostname, domainType, tenantSlug, pathname });

  const pass = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  // Public API — always pass
  if (pathname.startsWith("/api/public/")) return pass();

  // SuperAdmin
  if (
    domainType === "superadmin" ||
    SUPERADMIN_API_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    if (!pathname.startsWith("/auth/callback")) {
      const fail = pathname.startsWith("/api/")
        ? await guardApi(request, false, true)
        : await guardPage(request, false, true);
      if (fail) return fail;
    }
    return pass();
  }

  // Admin
  if (domainType === "admin") {
    if (pathname.startsWith("/api/")) {
      if (ADMIN_PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r))) {
        const fail = await guardApi(request, true);
        if (fail) return fail;
      }
    } else if (
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/forgot-password") &&
      !pathname.startsWith("/auth/callback")
    ) {
      const fail = await guardPage(request, true);
      if (fail) return fail;
    }
    return pass();
  }

  // Marketing
  if (domainType === "marketing") return pass();

  // Client
  if (domainType === "client") {
    if (
      pathname.startsWith("/api/") &&
      CLIENT_PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r))
    ) {
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
