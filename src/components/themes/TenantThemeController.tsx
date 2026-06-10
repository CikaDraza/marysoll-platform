"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

/**
 * Forces the LIGHT theme on every public tenant page (home, Usluge, Blog,
 * Termini, legal, auth …) so the dark/light preference a logged-in client
 * sets in their panel — saved in localStorage — never bleeds onto the
 * salon's public site, which is designed light-only.
 *
 * The only exception is the client panel (/panel), where the dark/light
 * toggle stays in effect.
 *
 * Rendered from app/tenant/layout.tsx, so it only ever runs on tenant routes
 * (the proxy rewrites tenant requests to /tenant/*) and stays mounted across
 * client-side navigation — no flicker when moving between public pages.
 */
export function TenantThemeController() {
  const pathname = usePathname();
  const { setForcedTheme } = useTheme();

  // Public path is "/panel" on subdomains/custom domains and "/{slug}/panel"
  // on localhost path-based dev — both end with "/panel".
  const isPanel = !!pathname && (pathname === "/panel" || pathname.endsWith("/panel"));

  useEffect(() => {
    setForcedTheme(isPanel ? null : "light");
    return () => setForcedTheme(null);
  }, [isPanel, setForcedTheme]);

  return null;
}
