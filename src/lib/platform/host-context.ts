/**
 * host-context.ts — JEDINA istina o tome kako se platforma servira na
 * trenutnom hostu. Uvoze ga i klijent (hookovi/komponente) i proxy/middleware.
 *
 * Dva režima:
 *   1. HOST-BASED (produkcija): marysoll.com, admin.marysoll.com,
 *      superadmin.marysoll.com, {slug}.marysoll.com, custom domen salona.
 *      Prelazak admin ↔ salon je prelazak na DRUGI host.
 *   2. PATH-BASED: localhost/LAN dev, Vercel preview (*.vercel.app) i staging
 *      apex hostovi (staging.marysoll.com, qa.marysoll.com). Ti hostovi NEMAJU
 *      admin/tenant subdomene — sve živi na istom hostu:
 *      `/login`, `/dashboard`, `/{slug}`, `/{slug}/panel`.
 *
 * Svaka odluka „redirektuj na drugi host ili ostani na ovom" mora da ide kroz
 * `isPathBasedHost()`. Ranije je svaka tačka imala svoju kopiju uslova
 * (localhost || 127. || *.vercel.app), pa su staging/qa ispadali iz njih:
 * login na staging.marysoll.com je vodio na nepostojeći admin.staging.marysoll.com
 * (odn. na PRODUKCIJSKI admin.marysoll.com), a „Sajt salona →" na prod subdomen.
 *
 * Ovde živi i gradnja APSOLUTNIH URL-ova (`platformOrigin`, `platformUrl`,
 * `tenantOrigin`, `tenantUrl`) — mejlovi, redirecti, sitemap i tracking linkovi
 * moraju da pokazuju na okruženje IZ KOGA su nastali. Bez toga staging/qa/dev
 * nemaju smisla: verifikacioni mejl sa staginga odvede testera u produkciju.
 *
 * Client-safe: nema `server-only` i nema `window`-a na modul nivou (koristi ga
 * i edge middleware). Env se čita pri IMPORTU — testovi rade vi.resetModules().
 */

export const BASE_DOMAIN =
  process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

const DEFAULT_STAGING_PATH_HOSTS = "staging.marysoll.com,qa.marysoll.com";

/**
 * Staging apex hostovi koji se ponašaju kao marketing i serviraju tenante
 * PATH-BASED, iako se završavaju na `.marysoll.com` (pa bi ih wildcard grana
 * inače pojela kao tenant subdomen „staging"/„qa").
 *
 * Env override: `NEXT_PUBLIC_STAGING_PATH_HOSTS` (vidljivo i u browseru — koristi
 * ovu varijantu ako menjaš listu) ili `STAGING_PATH_HOSTS` (samo server/middleware).
 */
export const STAGING_PATH_HOSTS = new Set(
  (
    process.env.NEXT_PUBLIC_STAGING_PATH_HOSTS ??
    process.env.STAGING_PATH_HOSTS ??
    DEFAULT_STAGING_PATH_HOSTS
  )
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);

/** Host bez porta, lowercase. */
export function bareHost(hostname: string): string {
  return hostname.split(":")[0].toLowerCase();
}

/** Lokalni razvoj: localhost, 127.x, LAN (192.168.x — testiranje sa telefona). */
export function isLocalHost(hostname: string): boolean {
  const host = bareHost(hostname);
  return (
    host === "localhost" ||
    host.startsWith("127.") ||
    host.startsWith("192.168.")
  );
}

/** staging.marysoll.com / qa.marysoll.com (ili šta god je u env listi). */
export function isStagingPathHost(hostname: string): boolean {
  return STAGING_PATH_HOSTS.has(bareHost(hostname));
}

/**
 * Host na kome NEMA admin/tenant subdomena — platforma i saloni se serviraju
 * po putanji: `/login`, `/dashboard`, `/{slug}`.
 */
export function isPathBasedHost(hostname: string): boolean {
  const host = bareHost(hostname);
  return (
    isLocalHost(host) ||
    host.endsWith(".vercel.app") ||
    STAGING_PATH_HOSTS.has(host)
  );
}

/**
 * Ključ OKRUŽENJA kome host pripada — dva hosta sa istim ključem servira ISTI
 * deploy (ista baza, iste sesije), pa im root-relativna putanja znači isto.
 *
 * Cela produkcija je JEDAN ključ (apex, `admin.`, `{slug}.`, custom domen
 * salona), jer je iza svih njih isti deploy. Staging/qa i SVAKI preview deploy
 * su zasebni ključevi — tamo ista putanja vodi u drugu sesiju.
 *
 * Koristi ga `lib/webPush.ts`: push pretplata je vezana za origin na kome je
 * service worker registrovan, pa se pretplate iz tuđeg okruženja preskaču.
 */
export function environmentKey(hostname: string): string {
  const host = bareHost(hostname);
  if (!host) return "unknown";
  if (isLocalHost(host)) return "local";
  // Staging/qa i preview: host JESTE okruženje (staging ≠ qa ≠ svaki preview).
  if (isStagingPathHost(host) || host.endsWith(".vercel.app")) return host;
  return "production";
}

/** Trenutni host u browseru; "" tokom SSR-a. */
export function currentHost(): string {
  return typeof window === "undefined" ? "" : window.location.hostname;
}

/** Da li je TRENUTNI (browser) host path-based. Tokom SSR-a: false. */
export function isCurrentPathBasedHost(): boolean {
  const host = currentHost();
  return host.length > 0 && isPathBasedHost(host);
}

/**
 * Origin admin panela — prefiks za `/dashboard` linkove sa marketing strana.
 * Prazan string = ISTI origin (path-based hostovi i SSR).
 */
export function adminOrigin(): string {
  return isCurrentPathBasedHost() || currentHost() === ""
    ? ""
    : `https://admin.${BASE_DOMAIN}`;
}

/**
 * Top-level segmenti koji pripadaju platformi — nikad tenant slug.
 * Mora da prati `RESERVED_TOP_SEGMENTS` u proxy/constants.ts (proxy odlučuje
 * isto ovo server-side; razilaženje = login forma gađa pogrešan endpoint).
 */
export const PLATFORM_PATH_SEGMENTS = new Set([
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
  "newsletter",
  "privacy",
  "terms",
  "terms-and-conditions",
  "refund",
  "pricing",
  "kontakt",
  "booking",
  "unauthorized",
  "logout",
  "tenant",
  "marketing",
  "education",
  "assets",
  "dijagnostika",
]);

/**
 * Slug salona iz putanje na path-based hostu (`/{slug}/panel` → "the-lash-room").
 * null za platformske putanje i za sve što nije čist slug.
 */
export function tenantSlugFromPath(pathname: string): string | null {
  const first = pathname.split("/").filter(Boolean)[0] ?? "";
  if (!first || PLATFORM_PATH_SEGMENTS.has(first)) return null;
  return /^[a-z0-9-]+$/.test(first) ? first : null;
}

export interface TenantSiteTarget {
  slug: string;
  customDomain?: string | null;
  customDomainVerified?: boolean | null;
}

/** Minimalni oblik zahteva — dovoljno za host (NextRequest, Request). */
export interface RequestLike {
  headers: { get(name: string): string | null };
  url?: string;
}

const DEV_PORT = process.env.PORT ?? "3006";

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function hostOfOrigin(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return "";
  }
}

function originFromRequest(req: RequestLike): string | null {
  const host = req.headers.get("host");
  if (host) {
    const proto =
      req.headers.get("x-forwarded-proto") ??
      (isLocalHost(host) ? "http" : "https");
    return `${proto}://${host}`;
  }
  // Bez host headera (npr. interni/test zahtevi) — origin iz URL-a zahteva.
  try {
    return req.url ? new URL(req.url).origin : null;
  } catch {
    return null;
  }
}

function joinUrl(origin: string, path: string): string {
  if (!path) return origin;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Origin platforme za TRENUTNO okruženje — JEDINI ulaz za apsolutne URL-ove.
 *
 * Redosled (od najtačnijeg):
 *   1. `req` — stvarni host zahteva (route handler / middleware).
 *   2. Browser — `window.location.origin`.
 *   3. DEV (`NODE_ENV !== "production"`) — uvek lokalni server. `.env.local`
 *      obično nosi PRODUKCIJSKI `NEXT_PUBLIC_APP_URL`, pa bi ga dev mejlovi i
 *      redirecti inače koristili. Lokalni/LAN `NEXT_PUBLIC_APP_URL` se poštuje.
 *   4. `NEXT_PUBLIC_APP_URL` — env po DEPLOYU (produkcija / staging / qa).
 *      Jači od VERCEL_URL-a, jer staging i qa jesu preview deployi ali imaju
 *      STALAN domen.
 *   5. Vercel preview BEZ svog domena — `https://${VERCEL_URL}`.
 *   6. `https://${BASE_DOMAIN}`.
 */
export function platformOrigin(req?: RequestLike): string {
  if (req) {
    const fromRequest = originFromRequest(req);
    if (fromRequest) return fromRequest;
  }
  if (typeof window !== "undefined") return window.location.origin;

  const envUrl = process.env.NEXT_PUBLIC_APP_URL
    ? normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
    : "";

  if (process.env.NODE_ENV !== "production") {
    const envHost = hostOfOrigin(envUrl);
    if (envHost && isLocalHost(envHost)) return envUrl;
    return `http://localhost:${DEV_PORT}`;
  }

  // Eksplicitan APP_URL je JAČI od VERCEL_URL-a: staging i qa su preview deployi
  // sa stalnim domenom (staging.marysoll.com), pa bi VERCEL_URL u mejlovima i
  // sitemap-u ostavio kratkoveki `*-git-*.vercel.app` link.
  if (envUrl) return envUrl;

  // Preview bez svog domena — tu je VERCEL_URL jedina istina.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return `https://${BASE_DOMAIN}`;
}

/** Apsolutni platformski URL: `platformUrl("/dashboard?tab=pretplata")`. */
export function platformUrl(path = "", req?: RequestLike): string {
  return joinUrl(platformOrigin(req), path);
}

/** Ključ okruženja iz apsolutnog origin-a; "" ako origin nije validan URL. */
export function environmentKeyOfOrigin(origin: string): string {
  const host = hostOfOrigin(origin);
  return host ? environmentKey(host) : "";
}

/**
 * Ključ okruženja u kome se OVAJ kod izvršava — za poređenje sa okruženjem u
 * kome je nastao neki zapis (push pretplata sa preview deploya i sl.).
 */
export function currentEnvironmentKey(req?: RequestLike): string {
  return environmentKeyOfOrigin(platformOrigin(req));
}

/**
 * Origin javnog sajta salona, u okruženju iz koga se poziva.
 *
 * Path-based okruženja (localhost/LAN, *.vercel.app, staging/qa) → `{origin}/{slug}`.
 * Produkcija → verifikovan custom domen, inače `{slug}.{BASE_DOMAIN}`.
 * Custom domen i prod subdomen UVEK pokazuju na produkciju (i produkcijsku bazu),
 * pa se van produkcije namerno ne koriste.
 */
/**
 * Da li OVO okruženje servira salone path-based (`{origin}/{slug}`) — dev,
 * Vercel preview i staging/qa. Produkcija: false (subdomen / custom domen).
 */
export function isPathBasedEnvironment(req?: RequestLike): boolean {
  return isPathBasedHost(hostOfOrigin(platformOrigin(req)));
}

export function tenantOrigin(
  tenant: TenantSiteTarget,
  req?: RequestLike,
): string {
  const origin = platformOrigin(req);
  if (isPathBasedHost(hostOfOrigin(origin))) {
    return `${origin}/${tenant.slug}`;
  }
  if (tenant.customDomain && tenant.customDomainVerified) {
    return `https://${bareHost(tenant.customDomain.replace(/^https?:\/\//, ""))}`;
  }
  return `https://${tenant.slug}.${BASE_DOMAIN}`;
}

/** Apsolutni URL unutar salona: `tenantUrl(tenant, "/panel?tab=Moji Termini")`. */
export function tenantUrl(
  tenant: TenantSiteTarget,
  path = "",
  req?: RequestLike,
): string {
  return joinUrl(tenantOrigin(tenant, req), path);
}
