/**
 * lib/auth/auth-client.ts
 *
 * CLIENT-ONLY auth funkcije.
 * Koristi se u hooks i Client Components.
 * NE importovati u Server Components, API routes, ili middleware!
 *
 * IZVOR ISTINE ZA SESIJU — prioritet (ovim redom):
 *   1. tenant-access-token cookie       — /api/tenant-auth/login
 *   2. platform-access-token cookie     — /api/auth/login (SUPER_ADMIN)
 *   3. localStorage["token"]            — SAMO keš, kad cookie ne postoji
 *
 * `localStorage` NIKADA ne sme imati prioritet nad aktivnom sesijom. Cookie je
 * ono što je server postavio pri prijavi i ono što server čita
 * (`getTokenFromRequest`); `localStorage` je klijentski keš za `Authorization:
 * Bearer` pozive i može biti ustajao — posle refresh-a, odjave u drugom tabu
 * ili prijave u drugom kontekstu. Dok je imao prioritet, panel je nastavljao da
 * šalje STARI identitet, pa je server pravilno scope-ovao upit prema pogrešnom
 * tenantu/akteru i vraćao 404 „nije pronađeno" — bez ijednog signala korisniku.
 *
 * Napomena o granici: ovo rešava USTAJAO keš. Ne rešava to što na path-based
 * hostovima (staging, localhost) admin panel i klijentski panel dele ISTI
 * origin, pa i cookie i `localStorage` imaju samo jedan slot; promenu konteksta
 * u drugom tabu hvata `useAuth` preko `storage` događaja i ponovne provere.
 */

import { DecodedUser } from "@/types/auth/types";
import { jwtDecode } from "jwt-decode";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Returns raw JWT string from storage/cookies.
 * Does NOT validate expiry — callers must check themselves.
 * No legacy cookie fallbacks.
 */
function cacheToken(token: string): void {
  try {
    if (localStorage.getItem("token") !== token) {
      localStorage.setItem("token", token);
    }
  } catch {
    /* privatni prozor / blokiran storage — keš je opcion */
  }
}

function readRawToken(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Aktivna sesija: tenant cookie (/api/tenant-auth/login, domain: undefined).
  const tenantCookie = readCookie("tenant-access-token");
  if (tenantCookie) {
    cacheToken(tenantCookie);
    return tenantCookie;
  }

  // 2. Aktivna sesija: platform cookie (/api/auth/login, domain: .marysoll.com).
  const platformCookie = readCookie("platform-access-token");
  if (platformCookie) {
    cacheToken(platformCookie);
    return platformCookie;
  }

  // 3. Keš — samo kada aktivne sesije nema. Pokriva tokove bez čitljivog
  //    cookie-ja (apex marketing origin, OAuth callback pre nego što cookie
  //    stigne). Ako je cookie obrisan odjavom, ovde se više ne dolazi sa
  //    prioritetom nego tek kao poslednja opcija.
  return localStorage.getItem("token") ?? null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Decodes and validates a JWT token.
 * If no token passed, reads from storage/cookies.
 * Returns null if missing, invalid, or expired.
 */
export function getUserFromToken(token?: string): DecodedUser | null {
  if (typeof window === "undefined") return null;

  const raw = token ?? readRawToken();
  if (!raw) return null;

  try {
    const decoded = jwtDecode<
      DecodedUser & {
        id?: string;
        sub?: string;
      }
    >(raw);

    if (decoded.exp * 1000 < Date.now()) {
      if (!token) localStorage.removeItem("token");
      return null;
    }

    return {
      id: decoded.id ?? decoded.sub ?? "",
      email: decoded.email ?? "",
      name: decoded.name ?? "",
      phone: decoded.phone ?? "",
      isAdmin: decoded.isAdmin ?? false,
      isSuperAdmin: decoded.isSuperAdmin ?? false,
      tenantUserId: decoded.tenantUserId ?? null,
      tenantId: decoded.tenantId ?? null,
      tenantSlug: decoded.tenantSlug ?? null,
      globalRole: decoded.globalRole,
      isEmailVerified: decoded.isEmailVerified ?? false,
      isOnline: decoded.isOnline,
      lastActive: decoded.lastActive,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Returns the raw JWT string (no expiry validation).
 */
export function getRawToken(): string | null {
  return readRawToken();
}

