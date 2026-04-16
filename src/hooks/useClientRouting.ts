/**
 * useClientRouting — resolves correct paths and redirect helpers for tenant
 * pages served at /tenant/* internally.
 *
 * Tenant context (slug, id, base) is injected by proxy.ts into x-tenant-*
 * headers and provided to client components via TenantContext (set in
 * app/tenant/layout.tsx).
 *
 * `base` rules (set server-side by the proxy, never guessed client-side):
 *   - ""          on production — subdomain / custom domain — links: /login, /panel
 *   - "/{slug}"   on localhost path-based dev — links: /kiki-kiss/panel
 */
"use client";

import { useTenant } from "@/contexts/TenantContext";

interface ClientRouting {
  tenantSlug: string;
  isCustomDomain: boolean;
  /**
   * "" on production; "/{slug}" in dev path-based mode.
   * Use to build all intra-salon links: `${base}/login`, `${base}/panel`.
   */
  base: string;
  path: (slug: string) => string;
}

export function detectCustomDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

  if (
    host !== "localhost" &&
    !host.startsWith("127.") &&
    !host.startsWith("192.168.") &&
    !host.endsWith(baseDomain) &&
    host !== baseDomain
  ) {
    return true;
  }

  const PLATFORM_SUBDOMAINS = new Set(["admin", "superadmin", "app", "www"]);
  if (host.endsWith(`.${baseDomain}`)) {
    const sub = host.slice(0, -(baseDomain.length + 1));
    if (!PLATFORM_SUBDOMAINS.has(sub)) return true;
  }

  return false;
}

export function useClientRouting(): ClientRouting {
  const { tenantSlug, base } = useTenant();
  const isCustomDomain = detectCustomDomain();

  return {
    tenantSlug,
    isCustomDomain,
    base,
    path: (slug: string) => `${base}${slug}`,
  };
}
