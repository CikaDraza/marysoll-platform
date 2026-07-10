"use client";

import { createContext, useContext } from "react";
import type { LandingTheme, ClientGender } from "@/types";

interface TenantCtx {
  tenantSlug: string;
  tenantId: string;
  /**
   * Navigation base prefix.
   * - "" on production (subdomain / custom domain) — links are root-relative (/login, /panel)
   * - "/{slug}" on localhost path-based dev — links include the slug (/kiki-kiss/panel)
   */
  base: string;
  /**
   * The salon's selected landing theme. Used by tenant auth pages to render the
   * matching themed form (e.g. the Y2K forms for "theme-8"). Optional — defaults
   * to undefined when not resolved.
   */
  landingTheme?: LandingTheme;
  /**
   * Rod klijentele salona (per-salon). Kada je "female", UI/obaveštenja koriste
   * ženski rod (npr. "Nije došla"). Default undefined/"neutral" = trenutno.
   */
  clientGender?: ClientGender;
}

export const TenantContext = createContext<TenantCtx>({
  tenantSlug: "",
  tenantId: "",
  base: "",
});

export function TenantProvider({
  tenantSlug,
  tenantId,
  base,
  landingTheme,
  clientGender,
  children,
}: TenantCtx & { children: React.ReactNode }) {
  return (
    <TenantContext.Provider
      value={{ tenantSlug, tenantId, base, landingTheme, clientGender }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantCtx {
  return useContext(TenantContext);
}
