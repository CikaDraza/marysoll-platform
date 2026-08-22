/**
 * Korak 2 — detect-domain: hostname → tip domena + tenant kontekst.
 *
 * Redosled detekcije: base domen → vercel preview → admin/superadmin →
 * wildcard subdomen → custom domen → localhost (DEV_DOMAIN_TYPE) → fallback.
 * Zatim path-based override (/{slug} na marketing/localhost/preview hostu)
 * i injektovanje x-* headera koje aplikacija čita.
 *
 * Tenant se razrešava kroz tenantClient (platformski adapter) — proxy ne
 * poznaje implementaciju (danas interne rute + keš, sutra Tenant Engine).
 * Nikad ne vraća response — samo puni kontekst.
 */
import type { NextRequest } from "next/server";
import { tenantClient } from "@/lib/platform/tenant-client";
import type { DomainType } from "../types";
import {
  BASE_DOMAIN,
  CUSTOM_CLIENT_DOMAIN,
  IS_PROD,
  RESERVED_TOP_SEGMENTS,
  STAGING_PATH_HOSTS,
  isCustomDomain,
} from "../constants";
import type { ProxyContext } from "./context";
import { trace } from "./context";

interface Detected {
  type: DomainType;
  tenantSlug: string | null;
  tenantId: string | null;
  customDomain: string | null;
  /** Za trace: koja grana detekcije je odlučila. */
  via: string;
}

const NONE = { tenantSlug: null, tenantId: null, customDomain: null };

async function detectDomainType(
  request: NextRequest,
  hostname: string,
): Promise<Detected> {
  const host = hostname.split(":")[0].toLowerCase();

  // 1. Base domain (marketing)
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) {
    return { type: "marketing", ...NONE, via: "base-domain" };
  }

  // 1b. Staging apex (qa/staging.marysoll.com): tretiraj kao marketing PRE
  // wildcard grane — inače bi `qa.marysoll.com` bio pojede kao tenant subdomen
  // "qa". Marketing tip uključuje path-based tenant rutiranje (dole) + /dashboard.
  if (STAGING_PATH_HOSTS.has(host)) {
    return { type: "marketing", ...NONE, via: "staging-path-apex" };
  }

  // 2. Vercel preview buildovi (grana → xxx.vercel.app): tretiraj kao marketing
  // da preview uopšte radi — inače bi pao u custom-domain granu, tenant lookup
  // bi omašio i SVE bi vraćalo 404. Marketing tip propušta i /dashboard i API
  // rute, pa se admin flow može testirati path-based (kao na localhost-u).
  if (host.endsWith(".vercel.app")) {
    return { type: "marketing", ...NONE, via: "vercel-preview" };
  }

  // 3. Admin subdomains
  if (host === `admin.${BASE_DOMAIN}`) {
    return { type: "admin", ...NONE, via: "admin-subdomain" };
  }
  if (host === `superadmin.${BASE_DOMAIN}`) {
    return { type: "superadmin", ...NONE, via: "superadmin-subdomain" };
  }

  // 4. Wildcard subdomains (tenant subdomain)
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1));
    if (!["admin", "superadmin", "app", "www"].includes(subdomain)) {
      const resolved = await tenantClient.resolveSlug(request, subdomain);
      return {
        type: "client",
        tenantSlug: resolved?.slug ?? subdomain,
        tenantId: resolved?.id ?? null,
        customDomain: resolved?.customDomain ?? null,
        via: "tenant-subdomain",
      };
    }
  }

  // 5. Custom domain — check env var first, then DB
  if (isCustomDomain(host, BASE_DOMAIN)) {
    if (CUSTOM_CLIENT_DOMAIN && host === CUSTOM_CLIENT_DOMAIN) {
      const resolved = await tenantClient.resolveDomain(request, host);
      if (resolved) {
        return {
          type: "client",
          tenantSlug: resolved.slug,
          tenantId: resolved.id,
          customDomain: resolved.customDomain,
          via: "custom-domain-env",
        };
      }
      return { type: "client", ...NONE, via: "custom-domain-env" };
    }

    const resolved = await tenantClient.resolveDomain(request, host);
    if (resolved) {
      return {
        type: "client",
        tenantSlug: resolved.slug,
        tenantId: resolved.id,
        customDomain: resolved.customDomain,
        via: "custom-domain",
      };
    }
    return { type: "client", ...NONE, via: "custom-domain" };
  }

  // 6. LOCALHOST
  if (!IS_PROD && host.startsWith("localhost")) {
    const devType = process.env.DEV_DOMAIN_TYPE as DomainType | undefined;
    if (devType === "admin") {
      return { type: "admin", ...NONE, via: "localhost-dev" };
    }
    if (devType === "superadmin") {
      return { type: "superadmin", ...NONE, via: "localhost-dev" };
    }
    if (devType === "client") {
      const slug = process.env.DEV_TENANT_SLUG ?? "default";
      const resolved =
        slug !== "default" ? await tenantClient.resolveSlug(request, slug) : null;
      return {
        type: "client",
        tenantSlug: resolved?.slug ?? slug,
        tenantId: resolved?.id ?? null,
        customDomain: resolved?.customDomain ?? null,
        via: "localhost-dev",
      };
    }
    return { type: "marketing", ...NONE, via: "localhost-dev" };
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
  return { type: "client", ...NONE, via: "unknown-host-fallback" };
}

export async function detectDomain(ctx: ProxyContext): Promise<null> {
  const detected = await detectDomainType(ctx.request, ctx.hostname);
  ctx.domainType = detected.type;
  ctx.tenant = {
    slug: detected.tenantSlug,
    id: detected.tenantId,
    customDomain: detected.customDomain,
  };
  trace(ctx, `domain=${detected.type} via ${detected.via}`);

  // Path-based tenant routing (marysoll.com/[slug] ili localhost/[slug] — dev,
  // odnosno *.vercel.app preview koji nema tenant subdomene).
  const isMarketingOrLocalhost =
    ctx.domainType === "marketing" ||
    (!IS_PROD && ctx.hostname.split(":")[0].startsWith("localhost"));

  if (isMarketingOrLocalhost) {
    const segments = ctx.pathname.split("/").filter(Boolean);
    const firstSegment = segments[0] ?? "";
    if (
      firstSegment.length > 0 &&
      !RESERVED_TOP_SEGMENTS.has(firstSegment) &&
      /^[a-z0-9-]+$/.test(firstSegment)
    ) {
      ctx.domainType = "client";
      const resolved = await tenantClient.resolveSlug(ctx.request, firstSegment);
      ctx.tenant = {
        slug: firstSegment,
        id: resolved?.id ?? null,
        customDomain: resolved?.customDomain ?? null,
      };
      const bareHost = ctx.hostname.split(":")[0].toLowerCase();
      // isPathBasedHost: slug je došao iz URL putanje (ne iz subdomena/custom
      // domena) — localhost dev, Vercel preview build ILI staging apex
      // (qa/staging.marysoll.com). Postavlja x-tenant-base-path na "/{slug}" pa
      // in-tenant navigacija radi ispravno.
      ctx.isPathBasedHost =
        (!IS_PROD && bareHost.startsWith("localhost")) ||
        bareHost.endsWith(".vercel.app") ||
        STAGING_PATH_HOSTS.has(bareHost);
      trace(ctx, `path slug '${firstSegment}' -> domain=client`);
    }
  }

  if (ctx.tenant.slug) {
    trace(
      ctx,
      ctx.tenant.id
        ? `tenant=${ctx.tenant.slug} (${ctx.tenant.id})`
        : `tenant=${ctx.tenant.slug} UNRESOLVED`,
    );
  }

  ctx.requestHeaders.set("x-domain-type", ctx.domainType);
  ctx.requestHeaders.set("x-tenant-slug", ctx.tenant.slug ?? "");
  ctx.requestHeaders.set("x-tenant-id", ctx.tenant.id ?? "");
  // Trusted proxy-derived values for server-side SEO identity.
  ctx.requestHeaders.set("x-tenant-custom-domain", ctx.tenant.customDomain ?? "");
  ctx.requestHeaders.set("x-public-host", ctx.hostname);
  // x-tenant-base-path: tenant layout gradi klijentsku navigaciju od ovoga.
  // Prazan na prod/subdomenu (URL-ovi su root-relative); "/{slug}" na
  // path-based hostovima (localhost dev i Vercel preview).
  ctx.requestHeaders.set(
    "x-tenant-base-path",
    ctx.isPathBasedHost ? `/${ctx.tenant.slug}` : "",
  );

  return null;
}
