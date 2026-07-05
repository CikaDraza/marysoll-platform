// src/proxy.ts
/**
 * proxy.ts — Multi-tenant Next.js middleware (ORKESTRATOR).
 *
 * Refaktor 2026-07-05 (Faza 4f): logika živi u src/lib/proxy/ modulima —
 *   types.ts        — deljeni tipovi (DecodedToken, AuthOut, DomainType…)
 *   constants.ts    — env čitanja, liste zaštićenih ruta, rezervisani segmenti
 *   resolvers.ts    — tenant/domen resolveri (interne rute + 5-min keš)
 *   domainType.ts   — detectDomainType (hostname → tip + tenant kontekst)
 *   auth.ts         — JWT verifikacija/refresh + guardApi/guardPage
 *   clientRouting.ts— kompletno tenant rutiranje (rewrite/redirect/guard)
 * Ovde ostaje samo redosled koraka. Ponašanje čuva src/proxy.test.ts (21 test).
 *
 * Security responsibilities:
 *  1. Resolves tenant from subdomain / custom-domain / path segment.
 *  2. Injects x-tenant-slug and x-tenant-id into every request.
 *  3. Guards protected routes (admin / superadmin / client).
 *  4. Tenant token mora da pripada razrešenom tenantId-ju (cross-tenant guard).
 *
 * Security boundary: tenantId (DB _id) — never slug alone.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AuthOut } from "@/lib/proxy/types";
import {
  RESERVED_TOP_SEGMENTS,
  SUPERADMIN_API_ROUTES,
  ADMIN_PROTECTED_API_ROUTES,
  IS_PROD,
} from "@/lib/proxy/constants";
import { resolveSlugToTenantId } from "@/lib/proxy/resolvers";
import { detectDomainType } from "@/lib/proxy/domainType";
import {
  applyRefreshedCookie,
  guardApi,
  guardPage,
} from "@/lib/proxy/auth";
import { handleClientDomain } from "@/lib/proxy/clientRouting";

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

  // Client — sve tenant rutiranje živi u lib/proxy/clientRouting.ts
  if (domainType === "client") {
    return handleClientDomain({
      request,
      requestHeaders,
      hostname,
      pathname,
      tenantSlug,
      tenantId,
      customDomain,
      isPathBasedHost,
    });
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
