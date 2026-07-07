"use client";

/**
 * Daljinska "crna kutija" za /dashboard — dijagnoza crash-eva kod korisnika
 * kojima ne možemo videti konzolu (support slučaj: stranica se ruši na iOS-u).
 *
 * Logika živi u @panta/diagnostic-engine (attachCrashReporter, scope "dash"
 * daje istorijske dash-boot / dash-error / dash-alive oznake u DiagReport).
 * Čitanje ishoda (superadmin → /api/superadmin/diag-reports):
 *   boot bez alive = JS umro u <5s; dash-error = imamo stack sa uređaja;
 *   ništa = chunkovi se uopšte ne izvršavaju.
 */

import { useEffect } from "react";
import { isPlatformHost } from "@/lib/browser-detect";
import { attachCrashReporter } from "@/lib/platform/diagnostic-client";

export function DashboardBeacon() {
  useEffect(() => {
    const host = window.location.hostname;
    if (!isPlatformHost(host) && host !== "localhost") return;
    return attachCrashReporter("dash");
  }, []);

  return null;
}
