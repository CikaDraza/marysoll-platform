"use client";

import { createContext, useContext } from "react";

interface TenantCtx {
  tenantSlug: string;
  tenantId: string;
  /**
   * Navigation base prefix.
   * - "" on production (subdomain / custom domain) — links are root-relative (/login, /panel)
   * - "/{slug}" on localhost path-based dev — links include the slug (/kiki-kiss/panel)
   */
  base: string;
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
  children,
}: TenantCtx & { children: React.ReactNode }) {
  return (
    <TenantContext.Provider value={{ tenantSlug, tenantId, base }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantCtx {
  return useContext(TenantContext);
}
