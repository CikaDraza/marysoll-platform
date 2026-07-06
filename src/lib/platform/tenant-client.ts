/**
 * Tenant Client — platformski adapter za razrešavanje tenanta.
 *
 * DANAS: interne /api/internal/* rute + 5-min in-memory keš po edge instanci.
 * SUTRA: Tenant Engine (HTTP/gRPC servis) — potrošači (proxy pipeline) ne
 * poznaju implementaciju, pričaju samo sa ovim klijentom.
 */
import type { NextRequest } from "next/server";
import { INTERNAL_FETCH_HEADERS } from "./internal-fetch";

export type TenantResolution = {
  slug: string;
  id: string;
  customDomain: string | null;
};

/** Keš custom-domen → { slug, id } rezolucija (5-min TTL). */
const domainCache = new Map<
  string,
  {
    slug: string | null;
    id: string | null;
    customDomain: string | null;
    ts: number;
  }
>();

/** Keš subdomen slug → tenantId rezolucija (5-min TTL). */
const tenantCache = new Map<
  string,
  { id: string; customDomain: string | null; ts: number }
>();

const CACHE_TTL = 5 * 60 * 1000;

async function resolveDomain(
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
      headers: INTERNAL_FETCH_HEADERS(),
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
 * Razrešava DB tenantId (_id) za dati slug. Koristi se za subdomen rutiranje
 * (slug iz hostname-a) i path-based rutiranje (slug iz URL putanje).
 */
async function resolveSlug(
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
      headers: INTERNAL_FETCH_HEADERS(),
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

export const tenantClient = { resolveSlug, resolveDomain };
