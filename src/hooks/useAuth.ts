"use client";
/**
 * hooks/useAuth.ts
 *
 * Jedini auth hook — sva logika za prijavu, registraciju, odjavu.
 * Komponente koriste SAMO ovaj hook, ne pišu fetch/axios direktno.
 *
 * Auth endpoint routing (URL-context-based, no role inspection):
 *   - superadmin.marysoll.com              → /api/auth/login (platform)
 *   - marysoll.com/login (no slug prefix)  → /api/auth/login (platform)
 *   - marysoll.com/[slug]/login            → /api/tenant-auth/login
 *   - [slug].marysoll.com / custom domain  → /api/tenant-auth/login
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getRawToken, getUserFromToken } from "@/lib/auth/auth-client";
import { publicApi, api } from "@/lib/api";
import { useCallback, useEffect } from "react";
import type { DecodedUser } from "@/types/auth/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserWithToken extends DecodedUser {
  token: string;
  _id: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  agreedToPrivacy: boolean;
}

interface LoginApiResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    tenantId: string | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";
}

function isProductionDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host !== "localhost" &&
    !host.startsWith("127.") &&
    !host.startsWith("192.168.")
  );
}

// Paths that belong to the platform — not tenant slugs
const PLATFORM_PATHS = new Set([
  "login",
  "register",
  "dashboard",
  "superadmin",
  "api",
  "newsletter",
  "privacy",
  "terms",
  "unauthorized",
  "forgot-password",
  "reset-password",
  "verify-email",
  "resend-verification",
]);

/**
 * Determine the auth endpoint based purely on URL context.
 *
 * Rules:
 *   1. superadmin.{base}              → platform auth
 *   2. localhost / 127.x / 192.168.x  → path-based (same logic as base domain)
 *   3. {base}/login or www.{base}/login (no slug prefix) → platform auth
 *   4. {base}/[slug]/login            → tenant auth
 *   5. Any subdomain or custom domain → tenant auth
 */
function getLoginEndpoint(): "/tenant-auth/login" | "/auth/login" {
  if (typeof window === "undefined") return "/tenant-auth/login";
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  const base = getBaseDomain();

  // Superadmin domain → platform auth
  if (hostname === `superadmin.${base}`) return "/auth/login";

  // Dev / LAN environments: use path-based routing identical to base domain
  const isLocal =
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.");

  // Base domain, www, or local dev: decide by path prefix
  if (isLocal || hostname === base || hostname === `www.${base}`) {
    const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
    // Non-reserved first segment = tenant slug → tenant auth
    if (firstSegment && !PLATFORM_PATHS.has(firstSegment)) {
      return "/tenant-auth/login";
    }
    return "/auth/login";
  }

  // Any subdomain or custom domain → tenant auth
  return "/tenant-auth/login";
}

function getRegisterEndpoint(): "/tenant-auth/register" | "/auth/register" {
  if (typeof window === "undefined") return "/tenant-auth/register";
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  const base = getBaseDomain();

  if (hostname === `superadmin.${base}`) return "/auth/register";

  const isLocal =
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.");

  if (isLocal || hostname === base || hostname === `www.${base}`) {
    const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
    if (firstSegment && !PLATFORM_PATHS.has(firstSegment)) {
      return "/tenant-auth/register";
    }
    return "/auth/register";
  }

  return "/tenant-auth/register";
}

function clearAllTokens(): void {
  localStorage.removeItem("token");

  if (isProductionDomain()) {
    const domain = `.${getBaseDomain()}`;
    // Platform cookies (domain-scoped)
    document.cookie = `platform-access-token=; max-age=0; path=/; domain=${domain}`;
    document.cookie = `platform-refresh-token=; max-age=0; path=/; domain=${domain}`;
  }

  // Tenant cookies (current domain only)
  document.cookie = "tenant-access-token=; max-age=0; path=/";
  document.cookie = "tenant-refresh-token=; max-age=0; path=/";
}

// ─── fetchUser ────────────────────────────────────────────────────────────────

async function fetchUser(): Promise<UserWithToken | null> {
  if (typeof window === "undefined") return null;
  const token = getRawToken();
  if (!token) return null;
  const user = getUserFromToken();
  if (!user) {
    localStorage.removeItem("token");
    return null;
  }
  return { ...user, _id: user.id, token };
}

// ─── useAuth ──────────────────────────────────────────────────────────────────

export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<UserWithToken | null>({
    queryKey: ["authUser"],
    queryFn: fetchUser,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // ── Online status ─────────────────────────────────────────────────────────
  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    const token = getRawToken();
    if (!token) return;
    try {
      await publicApi.post(
        "/users/status",
        { isOnline },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (user?.token) updateOnlineStatus(true);
  }, [user?.token, updateOnlineStatus]);

  useEffect(() => {
    const handleUnload = () => {
      const token = getRawToken();
      if (!token) return;
      const body = JSON.stringify({ isOnline: false });
      const url = "/api/users/status";
      if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon(
          url,
          new Blob([body], { type: "application/json" }),
        );
        if (!sent) {
          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } else {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", url, false);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.send(body);
        } catch {
          /* silent */
        }
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const loginMutation = useMutation<LoginApiResponse, unknown, LoginPayload>({
    mutationFn: async ({ email, password }) => {
      const endpoint = getLoginEndpoint();
      const { data } = await publicApi.post<LoginApiResponse>(endpoint, {
        email,
        password,
      });
      return data;
    },
    onSuccess: async (data) => {
      localStorage.setItem("token", data.token);
      await queryClient.invalidateQueries({ queryKey: ["authUser"] });
      await queryClient.refetchQueries({ queryKey: ["authUser"] });
      setTimeout(() => updateOnlineStatus(true), 100);

      const base = getBaseDomain();
      const encoded = encodeURIComponent(data.token);
      const prod = isProductionDomain();

      if (data.user.isSuperAdmin) {
        // SUPER_ADMIN → superadmin dashboard (from any login page)
        window.location.replace(
          prod
            ? `https://superadmin.${base}/superadmin/dashboard`
            : `/superadmin/dashboard`,
        );
      } else if (data.user.isAdmin) {
        // OWNER/ADMIN/STAFF → admin panel via callback token handoff
        window.location.replace(
          prod
            ? `https://admin.${base}/auth/callback?token=${encoded}&redirect=/dashboard`
            : `/dashboard`,
        );
      }
      // Clients — login page handles redirect
    },
    onError: (err: unknown) => {
      const apiErr = err as {
        response?: { data?: { error?: string; code?: string } };
      };
      const code = apiErr?.response?.data?.code;
      const msg = apiErr?.response?.data?.error ?? "Greška pri prijavi";
      if (code === "EMAIL_NOT_VERIFIED") {
        toast.error(
          "Email nije verifikovan. Proverite inbox ili zatražite novi link.",
          { duration: 5000 },
        );
      } else {
        toast.error(msg);
      }
    },
  });

  // ── Register ──────────────────────────────────────────────────────────────
  const registerMutation = useMutation<void, unknown, RegisterPayload>({
    mutationFn: async (payload) => {
      const endpoint = getRegisterEndpoint();
      await publicApi.post(endpoint, payload);
    },
    onSuccess: () => {
      toast.success("Uspešno! Molimo proverite vaš email da potvrdite nalog.");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Došlo je do greške pri registraciji.";
      toast.error(msg);
      throw new Error(msg);
    },
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  interface LogoutOptions {
    tenantSlug?: string;
  }

  const logoutMutation = useMutation<void, unknown, LogoutOptions>({
    mutationFn: async () => {
      const token = getRawToken();
      if (token) {
        try {
          await updateOnlineStatus(false);
          await api.post("/auth/logout");
        } catch {
          /* silent */
        }
      }
    },
    onSettled: (_data, _err, variables) => {
      clearAllTokens();
      queryClient.setQueryData(["authUser"], null);
      queryClient.clear();
      toast.success("Uspešno ste se odjavili");

      const tenantSlug = variables?.tenantSlug;

      if (tenantSlug) {
        const host = window.location.hostname;
        const base = getBaseDomain();
        const onCustomDomain =
          host !== "localhost" &&
          !host.startsWith("127.") &&
          !host.endsWith(base) &&
          host !== base;

        window.location.href = onCustomDomain
          ? "/login"
          : isProductionDomain()
            ? `https://${base}/${tenantSlug}/login`
            : `/${tenantSlug}/login`;
        return;
      }

      const base = getBaseDomain();
      window.location.href = isProductionDomain()
        ? `https://${base}/login`
        : "/login";
    },
  });

  return {
    user,
    token: user?.token ?? null,
    isLoggedIn: !!user,
    isAdmin: user?.isAdmin ?? false,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    tenantId: user?.tenantId ?? null,
    isLoading,
    isError,

    login: (email: string, password: string) =>
      loginMutation.mutateAsync({ email, password }),
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,

    register: (payload: RegisterPayload) =>
      registerMutation.mutateAsync(payload),
    isRegistering: registerMutation.isPending,

    logout: (options?: LogoutOptions) => logoutMutation.mutate(options ?? {}),
    isLoggingOut: logoutMutation.isPending,

    updateOnlineStatus,
  };
}
