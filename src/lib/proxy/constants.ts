/**
 * Proxy konstante: env čitanja (pri importu!), liste zaštićenih ruta i
 * rezervisani top-level segmenti. Testovi stubuju env pa rade svež import.
 * Headeri za interne fetch-eve: lib/platform/internal-fetch.ts.
 */

export const IS_PROD = process.env.NODE_ENV === "production";
export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
export const CUSTOM_CLIENT_DOMAIN = process.env.CUSTOM_CLIENT_DOMAIN ?? null;

/**
 * Staging apex hostovi koji se ponašaju kao marketing i dozvoljavaju PATH-BASED
 * tenant rutiranje (kao localhost/preview): npr. `qa.marysoll.com/{slug}` ili
 * `staging.marysoll.com/{slug}` otvara salon, iako `BASE_DOMAIN` ostaje
 * `marysoll.com` (pa bi ih inače wildcard grana pojela kao tenant subdomen).
 * Env override: `STAGING_PATH_HOSTS="a.com,b.com"`. Default pokriva qa i staging.
 */
export const STAGING_PATH_HOSTS = new Set(
  (process.env.STAGING_PATH_HOSTS ?? "staging.marysoll.com,qa.marysoll.com")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);

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

export const RESERVED_TOP_SEGMENTS = new Set([
  "dashboard",
  "superadmin",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "verify-email",
  "resend-verification",
  "checkout",
  "api",
  "_next",
  "favicon.ico",
  "newsletter",
  "privacy",
  "Pronađi termin",
  "terms-and-conditions",
  "refund",
  "pricing",
  "kontakt",
  "booking",
  "unauthorized",
  "logout",
  "tenant", // internal route prefix — must never be treated as a tenant slug
  "marketing",
  "assets", // static public assets folder
  "dijagnostika", // samouslužna mrežna dijagnostika (/dijagnostika)
]);

