/**
 * useClientRouting — resolves correct paths and redirect helpers for client
 * pages that can be served in two modes:
 *
 *   1. Path-based:   marysoll.com/kiki-makeup/login
 *   2. Custom domain: kikikiss.beauty/login  (middleware rewrites → /kiki-makeup/login internally)
 *
 * On a custom domain the URL the browser shows is root-relative (/login, /panel),
 * but `useParams().tenantSlug` still returns "kiki-makeup" because Next.js file-
 * system routing always serves app/[tenantSlug]/* pages internally.
 *
 * Rule:
 *   - Custom domain  → use "" as base  → links are /login, /panel, /
 *   - Path-based     → use "/kiki-makeup" as base → links are /kiki-makeup/login etc.
 */
"use client";

import { useParams } from "next/navigation";

interface ClientRouting {
  /** The raw tenantSlug from params — always the DB slug e.g. "kiki-makeup". */
  tenantSlug: string;
  /**
   * Whether we are on a custom domain (kikikiss.beauty).
   * Derived client-side from window.location.hostname.
   */
  isCustomDomain: boolean;
  /**
   * "" on custom domain, "/kiki-makeup" on path-based.
   * Use to build all intra-salon links: `${base}/login`, `${base}/panel` etc.
   */
  base: string;
  /** Resolve a salon-relative path to the correct href. */
  path: (slug: string) => string;
}

function detectCustomDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const baseDomain =
    process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
  return (
    host !== "localhost" &&
    !host.startsWith("127.") &&
    !host.startsWith("192.168.") &&
    !host.endsWith(baseDomain) &&
    host !== baseDomain
  );
}

export function useClientRouting(): ClientRouting {
  const params = useParams();
  const tenantSlug = (params?.tenantSlug as string) ?? "";
  const isCustomDomain = detectCustomDomain();
  const base = isCustomDomain ? "" : `/${tenantSlug}`;

  return {
    tenantSlug,
    isCustomDomain,
    base,
    path: (slug: string) => `${base}${slug}`,
  };
}
