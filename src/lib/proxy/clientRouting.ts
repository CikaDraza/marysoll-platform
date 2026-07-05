/**
 * handleClientDomain — kompletno tenant (client) rutiranje:
 * bezbednosni not-found za nerazrešen tenant, SEO kanonski 301 na custom
 * domen (samo host-based, NIKAD vercel preview), rewrite klijentskih ruta
 * na /tenant/* (host-based i path-based), guard zaštićenih klijentskih API-ja.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  BASE_DOMAIN,
  CLIENT_PROTECTED_API_ROUTES,
  IS_PROD,
  isCustomDomain,
} from "./constants";
import type { AuthOut } from "./types";
import { applyRefreshedCookie, guardApi } from "./auth";

export async function handleClientDomain(args: {
  request: NextRequest;
  requestHeaders: Headers;
  hostname: string;
  pathname: string;
  tenantSlug: string | null;
  tenantId: string | null;
  customDomain: string | null;
  isPathBasedHost: boolean;
}): Promise<NextResponse> {
  const {
    request,
    requestHeaders,
    hostname,
    pathname,
    tenantSlug,
    tenantId,
    customDomain,
    isPathBasedHost,
  } = args;

  const pass = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  // Block immediately if tenant couldn't be resolved — slug without a valid DB id is a security gap
  if (tenantId === null) {
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  const host = hostname.split(":")[0].toLowerCase();
  const PLATFORM_SUBDOMAINS = new Set(["admin", "superadmin", "app", "www"]);
  const isTenantSubdomain =
    host.endsWith(`.${BASE_DOMAIN}`) &&
    !PLATFORM_SUBDOMAINS.has(host.slice(0, -(BASE_DOMAIN.length + 1)));
  // Vercel preview NIJE host-based tenant domen — bez ovoga isCustomDomain()
  // broji *.vercel.app kao custom domen pa SEO kanonski redirect šalje
  // preview posetioce na pravi domen salona umesto da servira path-based.
  const isVercelPreview = host.endsWith(".vercel.app");
  const isHostBased =
    !isVercelPreview &&
    (isCustomDomain(hostname, BASE_DOMAIN) || isTenantSubdomain);

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
