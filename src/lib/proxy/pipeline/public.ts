/**
 * Korak 3 — public: rute koje se rešavaju ISTO za svaki tip domena, pre
 * auth grananja: tenant-svestan favicon, blokada direktnog /tenant/* pristupa
 * i javne API rute (nikad ne plaćaju JWT verifikaciju).
 */
import { NextResponse } from "next/server";
import type { ProxyContext } from "./context";
import { pass, trace } from "./context";

export function publicRoutes(ctx: ProxyContext): NextResponse | null {
  const { request, pathname, domainType } = ctx;

  // Tenant-aware favicon: browser gađa /favicon.ico direktno (bez tenant
  // metadata), pa bi inače dobio statički platform favicon. Za client domene
  // prosledi tenant resolveru; ostalo pada na statički favicon.
  if (pathname === "/favicon.ico") {
    if (domainType === "client" && ctx.tenant.id) {
      trace(ctx, "favicon -> /tenant/favicon");
      return NextResponse.rewrite(
        new URL("/tenant/favicon", request.nextUrl.origin),
        { request: { headers: ctx.requestHeaders } },
      );
    }
    trace(ctx, "favicon -> static pass");
    return pass(ctx);
  }

  // PWA manifest je tenant-specifičan: Android iz njega bira ikonu pri
  // instalaciji. Na path-based dev/preview URL-u ostaje pod /{slug}.
  const tenantManifestPath = ctx.isPathBasedHost
    ? `/${ctx.tenant.slug}/manifest.json`
    : "/manifest.json";
  if (
    pathname === tenantManifestPath &&
    domainType === "client" &&
    ctx.tenant.id
  ) {
    trace(ctx, "manifest -> /tenant/manifest");
    return NextResponse.rewrite(
      new URL("/tenant/manifest", request.nextUrl.origin),
      { request: { headers: ctx.requestHeaders } },
    );
  }

  // Block direct browser access to the internal /tenant/* route on non-client domains.
  if (
    (pathname === "/tenant" || pathname.startsWith("/tenant/")) &&
    domainType !== "client"
  ) {
    trace(ctx, "direct /tenant/* outside client -> /not-found");
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  // Public API — always pass
  if (pathname.startsWith("/api/public/")) {
    trace(ctx, "public api -> pass (auth skipped)");
    return pass(ctx);
  }

  // tenant-auth routes are always public (they ARE the auth endpoints)
  if (pathname.startsWith("/api/tenant-auth/")) {
    trace(ctx, "tenant-auth api -> pass (auth skipped)");
    return pass(ctx);
  }

  // Paddle webhook — public, self-verifies via signature; reachable from any
  // host (Paddle servers, tunnel za lokalni test, itd.)
  if (pathname.startsWith("/api/paddle/webhook")) {
    trace(ctx, "paddle webhook -> pass (self-verifies)");
    return pass(ctx);
  }

  // Browser-reset — javan sa svakog hosta: samo čisti kolačiće/keš pozivaoca
  // (Clear-Site-Data) i mora da radi i kad je auth stanje pokvareno/obrisano,
  // što mu je i svrha — klijentski helper prvo obriše tokene pa tek onda dođe ovde
  if (pathname.startsWith("/api/browser-reset")) {
    trace(ctx, "browser-reset -> pass");
    return pass(ctx);
  }

  return null;
}
