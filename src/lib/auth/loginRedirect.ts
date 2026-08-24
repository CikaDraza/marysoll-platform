/**
 * loginRedirect — KUDA posle uspešne prijave, po okruženju.
 *
 * Čista funkcija (bez React-a, bez window-a) da bi bila testabilna: sam
 * `useAuth` je samo poziva i radi `window.location.replace(...)`.
 *
 * Produkcija ima ZASEBNE hostove za panele, pa prijava na `marysoll.com/login`
 * mora da pređe na `admin.marysoll.com` — i to preko `/auth/callback?token=…`
 * jer je token u localStorage-u apeksa, a drugi origin ga ne vidi.
 *
 * Path-based okruženja (localhost/LAN, *.vercel.app preview, staging/qa apex)
 * NEMAJU te subdomene — panel je na istom hostu, pa ide relativan redirect
 * (`/dashboard`). Bez toga bi prijava na staging-u odvela korisnika na
 * nepostojeći `admin.staging.marysoll.com`, odnosno na PRODUKCIJSKI panel.
 */
import { BASE_DOMAIN, isLocalHost, isPathBasedHost } from "@/lib/platform/host-context";

export interface LoginRedirectParams {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Access token — potreban samo za cross-host handoff. */
  token: string;
  /** window.location.hostname u trenutku prijave. */
  hostname: string;
}

/**
 * Da li panel živi na drugom hostu (produkcijski subdomeni) ili na ovom.
 * Izvezeno da isti uslov koristi i odjava.
 */
export function usesPlatformSubdomains(hostname: string): boolean {
  return !isLocalHost(hostname) && !isPathBasedHost(hostname);
}

/** URL na koji treba preusmeriti; `null` za klijente salona (njih vodi login strana). */
export function loginRedirectUrl(params: LoginRedirectParams): string | null {
  const crossHost = usesPlatformSubdomains(params.hostname);

  if (params.isSuperAdmin) {
    return crossHost
      ? `https://superadmin.${BASE_DOMAIN}/superadmin/dashboard`
      : "/superadmin/dashboard";
  }

  if (params.isAdmin) {
    return crossHost
      ? `https://admin.${BASE_DOMAIN}/auth/callback?token=${encodeURIComponent(
          params.token,
        )}&redirect=/dashboard`
      : "/dashboard";
  }

  return null;
}

/** Kuda posle odjave: `/login` salona ili platforme, na pravom hostu. */
export function logoutRedirectUrl(params: {
  hostname: string;
  /** true kad je tenant sajt na sopstvenom hostu (subdomen ili custom domen). */
  isTenantHost: boolean;
  tenantSlug?: string | null;
}): string {
  if (params.tenantSlug) {
    if (params.isTenantHost) return "/login";
    return usesPlatformSubdomains(params.hostname)
      ? `https://${BASE_DOMAIN}/${params.tenantSlug}/login`
      : `/${params.tenantSlug}/login`;
  }
  return usesPlatformSubdomains(params.hostname)
    ? `https://${BASE_DOMAIN}/login`
    : "/login";
}
