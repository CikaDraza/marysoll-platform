"use client";

/**
 * usePlatformOwnerSession — jedinstveni izvor "da li je platformski korisnik
 * (tenant vlasnik/admin ili superadmin) prijavljen", upotrebljiv i na marketing
 * sajtu (marysoll.com) gde token NIJE lokalno vidljiv.
 *
 * Strategija:
 *   1. Lokalno (sinhrono): getUserFromToken() — radi na admin/superadmin origin-u
 *      gde token živi u localStorage / host cookie-ju (source: "local").
 *   2. Fallback (async): cross-origin same-site fetch na admin.marysoll.com/api/auth/whoami
 *      sa credentials:"include" — hvata vlasnika koji je prijavljen na admin.marysoll.com
 *      dok gleda marysoll.com (source: "remote").
 *
 * Remote rezultat se dedupe-uje modul-level promise-om (jedan fetch po učitavanju).
 */

import { useEffect, useState } from "react";
import { getUserFromToken } from "@/lib/auth/auth-client";

export interface OwnerSessionUser {
  name: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  tenantSlug: string | null;
  tenantId: string | null;
}

export interface OwnerSession {
  status: "loading" | "authed" | "anon";
  /** Odakle je sesija utvrđena — "remote" nema čist lokalni logout. */
  source: "local" | "remote" | null;
  user: OwnerSessionUser | null;
}

const ANON: OwnerSession = { status: "anon", source: null, user: null };

/**
 * Base URL admin origin-a (gde živi tenant-access-token cookie).
 * Localhost/dev: isti origin (token je već lokalno vidljiv, remote se i ne koristi).
 */
export function adminBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host === "localhost" || host.startsWith("127.")) return "";
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
  return `https://admin.${base}`;
}

interface WhoamiResponse {
  loggedIn: boolean;
  name?: string;
  email?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  tenantSlug?: string | null;
  tenantId?: string | null;
}

let remotePromise: Promise<OwnerSession> | null = null;

function fetchRemoteSession(): Promise<OwnerSession> {
  if (remotePromise) return remotePromise;

  remotePromise = (async () => {
    try {
      const res = await fetch(`${adminBaseUrl()}/api/auth/whoami`, {
        credentials: "include",
      });
      if (!res.ok) return ANON;
      const data = (await res.json()) as WhoamiResponse;
      if (!data.loggedIn) return ANON;
      return {
        status: "authed",
        source: "remote",
        user: {
          name: data.name ?? "",
          email: data.email ?? "",
          isAdmin: data.isAdmin ?? false,
          isSuperAdmin: data.isSuperAdmin ?? false,
          tenantSlug: data.tenantSlug ?? null,
          tenantId: data.tenantId ?? null,
        },
      } satisfies OwnerSession;
    } catch {
      return ANON;
    }
  })();

  return remotePromise;
}

export function usePlatformOwnerSession(): OwnerSession {
  const [session, setSession] = useState<OwnerSession>({
    status: "loading",
    source: null,
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    // Resolucija je async (setState samo u .then callback-u, nikad sinhrono u
    // effect body-ju) — inicijalno stanje "loading" je isto na serveru i klijentu,
    // pa nema hydration mismatch-a.
    async function resolve(): Promise<OwnerSession> {
      // 1. Lokalni token (admin/superadmin origin, ili superadmin platform cookie na apexu).
      const local = getUserFromToken();
      if (local) {
        return {
          status: "authed",
          source: "local",
          user: {
            name: local.name,
            email: local.email,
            isAdmin: local.isAdmin,
            isSuperAdmin: local.isSuperAdmin,
            tenantSlug: local.tenantSlug,
            tenantId: local.tenantId,
          },
        };
      }
      // 2. Cross-origin fallback (marketing sajt → admin whoami).
      return fetchRemoteSession();
    }

    resolve().then((result) => {
      if (!cancelled) setSession(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}
