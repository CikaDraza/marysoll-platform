/**
 * Proxy konstante: env čitanja (pri importu!), liste zaštićenih ruta i
 * rezervisani top-level segmenti. Testovi stubuju env pa rade svež import.
 * Headeri za interne fetch-eve: lib/platform/internal-fetch.ts.
 */

import { PLATFORM_PATH_SEGMENTS } from "@/lib/platform/host-context";

export const IS_PROD = process.env.NODE_ENV === "production";
export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
export const CUSTOM_CLIENT_DOMAIN = process.env.CUSTOM_CLIENT_DOMAIN ?? null;

/**
 * Staging apex hostovi (`staging.marysoll.com`, `qa.marysoll.com`) i ostatak
 * host-konteksta žive u lib/platform/host-context.ts — deljeno sa klijentom,
 * da proxy i browser nikad ne odluče različito o istom hostu.
 */
export { STAGING_PATH_HOSTS, isPathBasedHost } from "@/lib/platform/host-context";

/** Returns true when the request host is a fully custom domain (not *.marysoll.com or localhost). */
export function isCustomDomain(hostname: string, baseDomain: string): boolean {
  const host = hostname.split(":")[0];
  return (
    host !== "localhost" &&
    !host.startsWith("127.") &&
    host !== baseDomain &&
    !host.endsWith(`.${baseDomain}`)
  );
}

export const ADMIN_PROTECTED_API_ROUTES = [
  "/api/services/create",
  "/api/services",
  "/api/appointments",
  "/api/appointments/search",
  "/api/testimonials",
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
  "/api/tenants/identity",
  "/api/tenants/update",
  "/api/subscriptions",
];

export const SUPERADMIN_API_ROUTES = [
  "/api/superadmin",
  "/api/tenants/delete",
  "/api/plans",
];

export const CLIENT_PROTECTED_API_ROUTES = [
  "/api/appointments/create",
  "/api/appointments/client",
  "/api/testimonials/create",
  "/api/users/me",
];

/**
 * Rezervisani top-level segmenti = platformske putanje (deljene sa klijentom,
 * da login forma i proxy isto odluče šta je slug a šta platformska ruta) plus
 * par čisto proxy-jevskih.
 */
export const RESERVED_TOP_SEGMENTS = new Set([
  ...PLATFORM_PATH_SEGMENTS,
  "favicon.ico",
  "Pronađi termin",
]);

