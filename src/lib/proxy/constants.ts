/**
 * Proxy konstante: env čitanja (pri importu!), liste zaštićenih ruta i
 * rezervisani top-level segmenti. Testovi stubuju env pa rade svež import.
 */

export const IS_PROD = process.env.NODE_ENV === "production";

// Vercel preview + Deployment Protection: interni middleware fetch-evi (resolve
// tenant/domena, token refresh) nemaju browser kolačić pa ih auth zid na
// preview-u blokira iako browser prolazi. Secret postoji kad se u Vercel
// Settings → Deployment Protection uključi "Protection Bypass for Automation".
export const VERCEL_BYPASS_HEADERS: Record<string, string> = process.env
  .VERCEL_AUTOMATION_BYPASS_SECRET
  ? {
      "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
    }
  : {};
export const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
export const CUSTOM_CLIENT_DOMAIN = process.env.CUSTOM_CLIENT_DOMAIN ?? null;

/** Headeri za interne middleware fetch-eve: internal secret + preview bypass. */
export function INTERNAL_FETCH_HEADERS(): Record<string, string> {
  return {
    "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
    ...VERCEL_BYPASS_HEADERS,
  };
}

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

