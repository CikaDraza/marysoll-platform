/**
 * lib/auth/auth-client.ts
 *
 * CLIENT-ONLY auth funkcije.
 * Koristi se u hooks i Client Components.
 * NE importovati u Server Components, API routes, ili middleware!
 *
 * Cookie priority (in order):
 *   1. localStorage["token"]            — set by useAuth on login / callback
 *   2. tenant-access-token cookie       — set by /api/tenant-auth/login
 *   3. platform-access-token cookie     — set by /api/auth/login (SUPER_ADMIN)
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
function readRawToken(): string | null {
  if (typeof window === "undefined") return null;

  // 1. localStorage (highest priority — set explicitly by useAuth on login)
  const fromStorage = localStorage.getItem("token");
  if (fromStorage) return fromStorage;

  // 2. Tenant scoped cookie (set by /api/tenant-auth/login, domain: undefined)
  const tenantCookie = readCookie("tenant-access-token");
  if (tenantCookie) {
    try { localStorage.setItem("token", tenantCookie); } catch { /* ignore */ }
    return tenantCookie;
  }

  // 3. Platform scoped cookie (set by /api/auth/login, domain: .marysoll.com)
  const platformCookie = readCookie("platform-access-token");
  if (platformCookie) {
    try { localStorage.setItem("token", platformCookie); } catch { /* ignore */ }
    return platformCookie;
  }

  return null;
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

/**
 * Returns true if a valid, non-expired token exists.
 */
export function isTokenValid(): boolean {
  return getUserFromToken() !== null;
}

/**
 * Returns true if the current token expires within `thresholdMinutes`.
 */
export function isTokenExpiringSoon(thresholdMinutes = 5): boolean {
  const token = getRawToken();
  if (!token) return true;
  try {
    const decoded = jwtDecode<DecodedUser>(token);
    if (!decoded?.exp) return true;
    return decoded.exp - Date.now() / 1000 < thresholdMinutes * 60;
  } catch {
    return true;
  }
}
