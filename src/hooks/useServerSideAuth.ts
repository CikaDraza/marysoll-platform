// src/hooks/useServerSideAuth.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { AuthUser } from "@/types/auth/types";
import { jwtDecode } from "jwt-decode";
import { DecodedUser } from "@/types/auth/types";

/**
 * Čita token iz cookie (ne localStorage) i dekodira ga client-side.
 * Koristi se kao alternativa useAuth kada token dolazi iz cookie-ja.
 * Ne uvozi server-only funcije.
 */
export function useServerSideAuth() {
  return useQuery<AuthUser | null>({
    queryKey: ["serverSideAuth"],
    queryFn: (): AuthUser | null => {
      if (typeof document === "undefined") return null;

      const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
      const token = match?.[1];
      if (!token) return null;

      try {
        const decoded = jwtDecode<DecodedUser & { exp: number }>(token);
        if (!decoded || decoded.exp * 1000 < Date.now()) {
          return null;
        }
        return {
          id:      decoded.id ?? "",
          email:   decoded.email ?? "",
          name:    decoded.name ?? "",
          isAdmin: decoded.isAdmin ?? false,
          token,
          isOnline: decoded.isOnline,
        } satisfies AuthUser;
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
