"use client";
/**
 * hooks/useAuth.ts
 *
 * Jedini auth hook — sva logika za prijavu, registraciju, odjavu.
 * Komponente koriste SAMO ovaj hook, ne pišu fetch/axios direktno.
 *
 * Vraća:
 *   user, token, isAdmin, isSuperAdmin, tenantId
 *   login(email, password)   + isLoggingIn
 *   register(payload)        + isRegistering
 *   logout()                 + isLoggingOut
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

function clearAllTokens(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  if (isProductionDomain()) {
    const domain = `.${getBaseDomain()}`;
    document.cookie = `auth-token=; max-age=0; path=/; domain=${domain}`;
    document.cookie = `refreshToken=; max-age=0; path=/; domain=${domain}`;
  }
  document.cookie = "auth-token=; max-age=0; path=/";
  document.cookie = "token=; max-age=0; path=/";
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
      const { data } = await publicApi.post<LoginApiResponse>("/auth/login", {
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
        window.location.href = prod
          ? `https://superadmin.${base}/auth/callback?token=${encoded}&redirect=/superadmin/dashboard`
          : `/superadmin/dashboard`;
      } else if (data.user.isAdmin) {
        window.location.href = prod
          ? `https://admin.${base}/auth/callback?token=${encoded}&redirect=/dashboard`
          : `/dashboard`;
      }
      // Klijenti — komponenta radi router.push("/") sama
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
      await publicApi.post("/auth/register", payload);
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
  // ── Logout ────────────────────────────────────────────────────────────────

  /**
   * tenantSlug — when provided (client pages), redirects to /{tenantSlug}/login
   * instead of the global marysoll.com/login (admin login).
   */
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
        // Client logout — if on a custom domain, stay on /login (root-relative).
        // Otherwise use the marysoll.com/{tenantSlug}/login path.
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

      // Admin / marketing logout — go to main login
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
