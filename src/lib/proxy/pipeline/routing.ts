/**
 * Korak 5 — routing: završno rutiranje po tipu domena.
 *
 * Marketing → pass (bez auth-a). Client → kompletno tenant rutiranje:
 * bezbednosni not-found za nerazrešen tenant, SEO kanonski 301 na custom
 * domen (samo host-based, NIKAD vercel preview), rewrite klijentskih ruta
 * na /tenant/* (host-based i path-based), guard zaštićenih klijentskih API-ja.
 *
 * Route i rewrite su namerno JEDAN korak — rutiranje tenant sajtova JESTE
 * rewrite na interni /tenant/* prefiks.
 */
import { NextResponse } from "next/server";
import {
  BASE_DOMAIN,
  CLIENT_PROTECTED_API_ROUTES,
  IS_PROD,
  STAGING_PATH_HOSTS,
  isCustomDomain,
} from "../constants";
import { guardApi } from "../guards";
import type { ProxyContext } from "./context";
import { pass, trace } from "./context";

export async function route(ctx: ProxyContext): Promise<NextResponse | null> {
  if (ctx.domainType === "marketing") {
    trace(ctx, "routing: marketing -> pass (auth skipped)");
    return pass(ctx);
  }
  if (ctx.domainType === "client") {
    return handleClientDomain(ctx);
  }
  return null;
}

const CLIENT_TENANT_PATHS = new Set([
  "/login",
  "/register",
  "/panel",
  "/termini",
  "/usluge",
  // Javna edukacija; `startsWith(p + "/")` pokriva i `/edukacija/<slug>`.
  "/edukacija",
  "/forgot-password",
  "/resend-verification",
  "/cookie-policy",
  "/pravila-privatnosti",
  "/politika-privatnosti",
  "/pravila-zakazivanja",
  "/newsletter",
  "/blogs",
  "/checkin",
  // theme-9 „Expert Editorial" strane; ostale teme ih nemaju i vraćaju not-found.
  "/za-klijente",
  "/za-profesionalce",
]);

const PLATFORM_SUBDOMAINS = new Set(["admin", "superadmin", "app", "www"]);

async function handleClientDomain(ctx: ProxyContext): Promise<NextResponse> {
  const { request, requestHeaders, hostname, pathname } = ctx;
  const { slug: tenantSlug, id: tenantId, customDomain } = ctx.tenant;

  // Block immediately if tenant couldn't be resolved — slug without a valid DB id is a security gap
  if (tenantId === null) {
    trace(ctx, "routing: tenant unresolved -> /not-found");
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  const host = hostname.split(":")[0].toLowerCase();
  const isTenantSubdomain =
    host.endsWith(`.${BASE_DOMAIN}`) &&
    !PLATFORM_SUBDOMAINS.has(host.slice(0, -(BASE_DOMAIN.length + 1)));
  // Vercel preview NIJE host-based tenant domen — bez ovoga isCustomDomain()
  // broji *.vercel.app kao custom domen pa SEO kanonski redirect šalje
  // preview posetioce na pravi domen salona umesto da servira path-based.
  const isVercelPreview = host.endsWith(".vercel.app");
  // Staging apex (qa/staging.marysoll.com) služi tenante PATH-BASED, kao vercel
  // preview — iako se završava na `.marysoll.com` (pa bi ga isTenantSubdomain
  // inače proglasio host-based i okinuo kanonski 301 na pravi custom domen).
  const isStagingPathHost = STAGING_PATH_HOSTS.has(host);
  const isHostBased =
    !isVercelPreview &&
    !isStagingPathHost &&
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
    trace(ctx, `routing: canonical 301 -> https://${customDomain}${pathname}`);
    return NextResponse.redirect(canonicalUrl, 301);
  }

  // In production, path-based tenant routing (marysoll.com/slug/...) is NOT supported.
  // Izuzetak: Vercel preview buildovi (*.vercel.app) i staging apex hostovi
  // (qa/staging.marysoll.com) nemaju tenant subdomene, pa se tenant sajtovi
  // testiraju path-based kao na localhost-u.
  if (IS_PROD && !isHostBased && !isVercelPreview && !isStagingPathHost) {
    trace(ctx, "routing: prod path-based blocked -> /not-found");
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  const rewriteTo = (internalPath: string): NextResponse => {
    const rewriteUrl = new URL(internalPath, request.nextUrl.origin);
    rewriteUrl.search = request.nextUrl.search;
    trace(ctx, `rewrite -> ${internalPath}`);
    return NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
  };

  // PRODUCTION: subdomain or custom domain — rewrite /path → /tenant/path
  if (tenantSlug && isHostBased) {
    if (pathname === "/blog" || pathname.startsWith("/blog/")) {
      return rewriteTo(`/tenant/blogs${pathname}`);
    }

    const matchesClientPath =
      CLIENT_TENANT_PATHS.has(pathname) ||
      [...CLIENT_TENANT_PATHS].some((p) => pathname.startsWith(p + "/"));

    if (matchesClientPath || pathname === "/") {
      return rewriteTo(pathname === "/" ? "/tenant" : `/tenant${pathname}`);
    }
  }

  // PATH-BASED (localhost dev + Vercel preview): strip slug,
  // rewrite /{slug}/path → /tenant/path
  if (tenantSlug && ctx.isPathBasedHost) {
    const segments = pathname.split("/").filter(Boolean);
    const pathAfterSlug = segments.slice(1).join("/");
    const restPath = pathAfterSlug ? `/${pathAfterSlug}` : "";

    if (restPath === "/blog" || restPath.startsWith("/blog/")) {
      return rewriteTo(`/tenant/blogs${restPath}`);
    }

    const matchesAfterSlug =
      CLIENT_TENANT_PATHS.has(restPath) ||
      [...CLIENT_TENANT_PATHS].some((p) => restPath.startsWith(p + "/"));

    if (matchesAfterSlug || restPath === "") {
      return rewriteTo(restPath ? `/tenant${restPath}` : "/tenant");
    }
  }

  // Zaštićene klijentske API rute — lazy auth, isti guard kao platformski
  if (
    pathname.startsWith("/api/") &&
    CLIENT_PROTECTED_API_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    const fail = await guardApi(request, tenantId, false, false, ctx.auth);
    if (fail) {
      trace(ctx, "auth: client api guard FAILED");
      return fail;
    }
    trace(ctx, "auth: client api ok");
  }

  trace(ctx, "routing: client pass");
  return pass(ctx);
}
