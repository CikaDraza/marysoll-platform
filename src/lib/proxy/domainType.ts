/**
 * detectDomainType — hostname → tip domena + tenant kontekst.
 * Redosled: base domen → vercel preview → admin/superadmin → wildcard
 * subdomen → custom domen → localhost (DEV_DOMAIN_TYPE) → fallback.
 */
import type { NextRequest } from "next/server";
import type { DomainType, TenantResolution } from "./types";
import {
  BASE_DOMAIN,
  CUSTOM_CLIENT_DOMAIN,
  IS_PROD,
  isCustomDomain,
} from "./constants";
import { resolveCustomDomain, resolveSlugToTenantId } from "./resolvers";

// ─── Domain detection ─────────────────────────────────────────────────────────
export async function detectDomainType(
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

