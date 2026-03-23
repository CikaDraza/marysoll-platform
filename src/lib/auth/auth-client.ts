/**
 * lib/auth/auth-client.ts
 *
 * CLIENT-ONLY auth funkcije.
 * Koristi se u hooks i Client Components.
 * NE importovati u Server Components, API routes, ili middleware!
 */

import { DecodedUser } from "@/types/auth/types";
import { jwtDecode } from "jwt-decode";

/**
 * Čita i dekodira JWT token.
 * Ako token nije prosleđen, čita iz localStorage (browser context).
 * Vraća null ako token ne postoji, nije validan, ili je istekao.
 */
export function getUserFromToken(token?: string): DecodedUser | null {
  if (typeof window === "undefined") return null;

  // Priority: explicit arg > localStorage > cookie (shared across subdomains)
  let raw = token ?? localStorage.getItem("token");

  // Fallback: čitaj iz cookie "auth-token" koji je shared na .marysoll.com
  if (!raw) {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)auth-token=([^;]+)/);
    if (cookieMatch) {
      raw = decodeURIComponent(cookieMatch[1]);
      // Sačuvaj u localStorage za buduće pozive
      try {
        localStorage.setItem("token", raw);
      } catch {
        /* ignore */
      }
    }
  }

  if (!raw) return null;

  try {
    const decoded = jwtDecode<
      DecodedUser & {
        id?: string; // nekim JWT-ovima id umesto _id
        sub?: string;
      }
    >(raw);

    if (decoded.exp * 1000 < Date.now()) {
      if (!token) localStorage.removeItem("token"); // samo ako čitamo iz LS
      return null;
    }

    return {
      // Normalizujemo id → koristimo onako kako je u JWT-u
      // DecodedUser koristi `id` (ne `_id`) - vidi types/auth/types.ts
      id: decoded.id ?? decoded.sub ?? "",
      email: decoded.email ?? "",
      name: decoded.name ?? "",
      phone: decoded.phone ?? "",
      isAdmin: decoded.isAdmin ?? false,
      isSuperAdmin: decoded.isSuperAdmin ?? false,
      tenantId: decoded.tenantId ?? null,
      userType: decoded.userType ?? "guest",
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
 * Čita raw token string iz localStorage.
 */
export function getRawToken(): string | null {
  if (typeof window === "undefined") return null;

  // Najpre localStorage, pa cookie kao fallback
  const fromStorage = localStorage.getItem("token");
  if (fromStorage) return fromStorage;

  // Cookie fallback (shared .marysoll.com cookie)
  const cookieMatch = document.cookie.match(/(?:^|;\s*)auth-token=([^;]+)/);
  if (cookieMatch) {
    const token = decodeURIComponent(cookieMatch[1]);
    try {
      localStorage.setItem("token", token);
    } catch {
      /* ignore */
    }
    return token;
  }

  return null;
}

/**
 * Proverava da li je token validan (postoji i nije istekao).
 */
export function isTokenValid(): boolean {
  return getUserFromToken() !== null;
}

/**
 * Proverava da li je token blizu isteka (default: 5 minuta).
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
