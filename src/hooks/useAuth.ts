/**
 * hooks/useAuth.ts
 *
 * CLIENT-ONLY hook za autentifikaciju.
 * Čita JWT token iz localStorage (auth-client funkcije — nema server-only koda).
 */
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getUserFromToken, getRawToken } from "@/lib/auth/auth-client";
import { publicApi } from "@/lib/api";
import { useCallback, useEffect } from "react";
import { DecodedUser } from "@/types/auth/types";

interface UserWithToken extends DecodedUser {
  token: string;
  /** @alias id — provided by fetchUser for backward compat */
  _id: string;
}

async function fetchUser(): Promise<UserWithToken | null> {
  if (typeof window === "undefined") return null;
  const token = getRawToken();
  if (!token) return null;
  const user = getUserFromToken(); // reads from localStorage via optional arg
  if (!user) {
    localStorage.removeItem("token");
    return null;
  }
  // Provide _id alias for backward compat (some components use user._id)
  return { ...user, _id: user.id, token };
}

export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["authUser"],
    queryFn: fetchUser,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

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
      // silent fail
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

      // Prefer sendBeacon (non-blocking, reliable on page unload)
      // sendBeacon(url, body) — 2 params required; cannot set auth header,
      // so we fall back to fetch(keepalive) which supports headers.
      if (navigator.sendBeacon) {
        // Try sendBeacon first (simplest, but no auth header)
        const sent = navigator.sendBeacon(
          url,
          new Blob([body], { type: "application/json" }),
        );
        if (!sent) {
          // sendBeacon returned false (queue full etc.) — fallback to fetch keepalive
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
        // Legacy fallback: sync XHR (deprecated but works in old browsers)
        try {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", url, false); // synchronous
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.send(body);
        } catch {
          // silent fail
        }
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const login = async (token: string) => {
    localStorage.setItem("token", token);
    await queryClient.invalidateQueries({ queryKey: ["authUser"] });
    await queryClient.refetchQueries({ queryKey: ["authUser"] });
    setTimeout(() => updateOnlineStatus(true), 100);
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    agreedToPrivacy: boolean;
  }) => {
    try {
      await publicApi.post("/auth/register", payload);
      toast.success("Uspešno! Molimo proverite vaš email da potvrdite nalog.");
      return true;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Došlo je do greške pri registraciji.";
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    const token = getRawToken();
    if (token) {
      try {
        await updateOnlineStatus(false);
        await publicApi.post(
          "/auth/logout",
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch {
        // silent fail
      }
    }
    localStorage.removeItem("token");
    queryClient.setQueryData(["authUser"], null);
    toast.success("Uspešno ste se odjavili");
  };

  return {
    user,
    isLoggedIn: !!user,
    isAdmin: user?.isAdmin ?? false,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    token: user?.token ?? null,
    tenantId: user?.tenantId ?? null,
    isLoading,
    isError,
    login,
    logout,
    register,
    updateOnlineStatus,
  };
}
