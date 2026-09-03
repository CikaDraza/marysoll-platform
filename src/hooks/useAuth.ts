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
 *
 * Path-based hostovi (localhost/LAN, *.vercel.app, staging/qa apex) nemaju
 * admin/tenant subdomene — SVE ostaje na istom hostu (host-context.ts).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getRawToken, getUserFromToken } from "@/lib/auth/auth-client";
import { detectCustomDomain } from "@/hooks/useClientRouting";
import {
  BASE_DOMAIN,
  isPathBasedHost,
  tenantSlugFromPath,
} from "@/lib/platform/host-context";
import { loginRedirectUrl, logoutRedirectUrl } from "@/lib/auth/loginRedirect";
import { publicApi, api } from "@/lib/api";
import { useCallback, useEffect } from "react";
import type { DecodedUser } from "@/types/auth/types";
import type { TenantCapabilitySnapshot } from "@/types/tenant-capabilities";
import { initialAdminWorkspacePath } from "@/lib/platform/workspace-capabilities";

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
  return BASE_DOMAIN;
}

/**
 * Da li host dozvoljava domain-scoped (`.marysoll.com`) cookie-je — server ih
 * postavlja u produkciji, pa ih odjava tu i briše. Localhost/LAN nemaju domain
 * cookie; staging/preview ga imaju (NODE_ENV=production) i moraju da ga obrišu.
 */
function isProductionDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host !== "localhost" &&
    !host.startsWith("127.") &&
    !host.startsWith("192.168.") &&
    !host.endsWith(".vercel.app")
  );
}

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

  // Path-based hostovi (dev/LAN, *.vercel.app preview, staging/qa apex) i apex
  // marketing domen: kontekst nosi PUTANJA. Bez ovoga bi login na
  // staging.marysoll.com pao u tenant-auth granu ("Prijava zahteva kontekst salona").
  if (
    isPathBasedHost(hostname) ||
    hostname === base ||
    hostname === `www.${base}`
  ) {
    // Non-reserved first segment = tenant slug → tenant auth
    return tenantSlugFromPath(pathname) ? "/tenant-auth/login" : "/auth/login";
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

  if (
    isPathBasedHost(hostname) ||
    hostname === base ||
    hostname === `www.${base}`
  ) {
    return tenantSlugFromPath(pathname)
      ? "/tenant-auth/register"
      : "/auth/register";
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

// ─── Online status: jedan prijavni kanal za sve instance hook-a ──────────────

/** Jedan upis „na vezi / nije na vezi". Deljen između upita i mutacije. */
async function postOnlineStatus(isOnline: boolean, token: string): Promise<void> {
  await publicApi.post(
    "/users/status",
    { isOnline },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

/**
 * `beforeunload` beacon — registrovan JEDNOM, ma koliko komponenti koristilo
 * hook.
 *
 * Isti razlog kao kod automatskog pinga: bez brojanja pretplata svih ~60
 * instanci hook-a dodavalo je svoj listener, pa je zatvaranje taba slalo ~60
 * beacon-a umesto jednog. Brojač skida listener tek kad se odjavi poslednja
 * instanca, pa fast-refresh i unmount u testovima ne ostavljaju viseći
 * listener.
 */
let unloadSubscribers = 0;
let unloadHandler: (() => void) | null = null;

function sendOfflineBeacon(): void {
  const token = getRawToken();
  if (!token) return;
  const body = JSON.stringify({ isOnline: false });
  const url = "/api/users/status";
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      url,
      new Blob([body], { type: "application/json" }),
    );
    if (sent) return;
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
      keepalive: true,
    }).catch(() => {});
    return;
  }
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

function subscribeUnloadBeacon(): () => void {
  if (typeof window === "undefined") return () => {};
  unloadSubscribers += 1;
  if (unloadSubscribers === 1) {
    unloadHandler = sendOfflineBeacon;
    window.addEventListener("beforeunload", unloadHandler);
  }
  return () => {
    unloadSubscribers -= 1;
    if (unloadSubscribers === 0 && unloadHandler) {
      window.removeEventListener("beforeunload", unloadHandler);
      unloadHandler = null;
    }
  };
}

export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<UserWithToken | null>({
    queryKey: ["authUser"],
    queryFn: fetchUser,
    // Sesija se NE kešira zauvek. Na path-based hostovima (staging, localhost)
    // admin panel i klijentski panel dele isti origin, pa prijava/odjava u
    // drugom tabu menja sesiju i ovog taba. Sa `staleTime: Infinity` i bez
    // refetch-a, panel je ostajao otvoren sa tuđim identitetom i slao ga na
    // server — koji je onda ispravno vraćao 404 za termin van tog scope-a.
    // `fetchUser` čita cookie/localStorage i dekodira JWT: nema mrežnog poziva,
    // pa je česta ponovna provera praktično besplatna.
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Promena sesije u DRUGOM tabu istog origin-a. `storage` se emituje samo u
  // ostalim tabovima, što je tačno slučaj koji nam je nedostajao: prijava ili
  // odjava tamo mora da obori keširanog korisnika ovde, da bi guard stranice
  // (npr. `!user.isAdmin` na /dashboard) mogao da odreaguje.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== "token") return;
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  // ── Online status (derived 3-state) ───────────────────────────────────────
  //   "pending" = auth still resolving, or status POST not yet confirmed (yellow)
  //   "online"  = authenticated and status update confirmed (green)
  //   "offline" = auth resolved with no valid token (red)
  const statusMutation = useMutation<boolean, unknown, boolean>({
    mutationFn: async (isOnline: boolean) => {
      const token = getRawToken();
      if (!token) throw new Error("Missing token");
      await postOnlineStatus(isOnline, token);
      return isOnline;
    },
  });
  const { mutateAsync: postStatus } = statusMutation;

  /** Imperativna prijava statusa (npr. ručna akcija). Automatski ping ide kroz
   *  deljeni upit ispod — ne kroz ovo. */
  const updateOnlineStatus = useCallback(
    (isOnline: boolean) => postStatus(isOnline).catch(() => {}),
    [postStatus],
  );

  /**
   * Automatska prijava „na vezi" — JEDNOM po sesiji, za sve instance hook-a.
   *
   * `useAuth()` NIJE context nego običan hook i zove ga ~60 komponenti. Dok je
   * ovaj ping bio `useMutation` + `useEffect`, svaka montirana komponenta
   * slala je svoj `POST /api/users/status`: jedno učitavanje dashboard-a davalo
   * je ~24 identična zahteva, u rafalima kako se komponente montiraju.
   * `useQuery` je ovde ispravan alat jer React Query dedupuje po KLJUČU — sve
   * instance dele jedan zahtev i jedan rezultat, pa i `onlineStatus` ostaje
   * konzistentan svuda.
   *
   * Ključ nosi token: nova sesija = nov ključ = tačno jedna nova prijava.
   * `staleTime: Infinity` + isključeni refetch-evi znače da montiranje još
   * jedne komponente ne pravi nov zahtev.
   */
  const statusQuery = useQuery<boolean>({
    queryKey: ["onlineStatus", user?.token ?? null],
    queryFn: async () => {
      const token = getRawToken();
      if (!token) throw new Error("Missing token");
      await postOnlineStatus(true, token);
      return true;
    },
    enabled: !isLoading && Boolean(user?.token),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const onlineStatus: "pending" | "online" | "offline" = isLoading
    ? "pending"
    : !user?.token
      ? "offline"
      : statusQuery.isSuccess && statusQuery.data === true
        ? "online"
        : "pending";

  // Registruje se jednom za ceo tab (vidi `subscribeUnloadBeacon`).
  useEffect(() => subscribeUnloadBeacon(), []);

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
      // Status se NE šalje odavde. Ovaj `setTimeout` je pucao u trenutku kada
      // `window.location.replace()` već ruši stranicu, pa je dev server
      // prijavljivao `Error: aborted (ECONNRESET)` za prekinut zahtev. Nova
      // stranica ionako sama prijavi status kroz deljeni `onlineStatus` upit,
      // a kada redirekcije nema (klijentski tok), upit se okine čim
      // `authUser` dobije token.

      // Produkcija → admin./superadmin. subdomen (cross-host handoff);
      // dev/preview/staging → relativno na istom hostu. Klijenti: null.
      let adminDestination: "/dashboard" | "/education" = "/dashboard";
      if (data.user.isAdmin && !data.user.isSuperAdmin) {
        try {
          const response = await api.get<TenantCapabilitySnapshot>(
            "/tenant/capabilities",
          );
          queryClient.setQueryData(
            ["tenantCapabilities"],
            response.data,
          );
          adminDestination = initialAdminWorkspacePath(response.data);
        } catch {
          // Auth still succeeds. The dashboard keeps the legacy-safe fallback,
          // while its own capability projection can redirect after loading.
        }
      }

      const target = loginRedirectUrl({
        isAdmin: data.user.isAdmin,
        isSuperAdmin: data.user.isSuperAdmin,
        token: data.token,
        hostname: window.location.hostname,
        adminDestination,
      });
      if (target) window.location.replace(target);
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

      // Tenant subdomen i custom domen serviraju salon na rootu → "/login" na
      // istom hostu (detectCustomDomain pokriva oba). Path-based okruženja i
      // apex koriste "/{slug}/login" prefiks.
      window.location.href = logoutRedirectUrl({
        hostname: window.location.hostname,
        isTenantHost: detectCustomDomain(),
        tenantSlug: variables?.tenantSlug,
      });
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
    onlineStatus,

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
