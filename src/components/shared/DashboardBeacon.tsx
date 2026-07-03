"use client";

/**
 * Daljinska "crna kutija" za /dashboard — dijagnoza crash-eva kod korisnika
 * kojima ne možemo videti konzolu (support slučaj: stranica se ruši na iOS-u).
 *
 * Šalje tri vrste beacona na postojeći /api/public/diag-report (DiagReport):
 *   - "dash-boot"  — JS je krenuo da se izvršava (odmah na mount)
 *   - "dash-error" — uhvaćen window error / unhandled rejection (poruka+stack)
 *   - "dash-alive" — stranica je preživela prvih 5s
 *
 * Čitanje ishoda (superadmin → /api/superadmin/diag-reports):
 *   boot bez alive = JS umro u <5s; dash-error = imamo stack sa uređaja;
 *   ništa = chunkovi se uopšte ne izvršavaju.
 *
 * navigator.sendBeacon: preživljava i unload stranice, string payload
 * (endpoint parsira req.text() pa Content-Type nije bitan).
 */

import { useEffect } from "react";
import { isPlatformHost } from "@/lib/browser-detect";

function send(label: string, extra?: Record<string, unknown>) {
  try {
    const payload = JSON.stringify({
      label,
      pageHost: window.location.host,
      results: [
        {
          key: label,
          name: label,
          state: "info",
          ms: Math.round(performance.now()),
          detail: JSON.stringify(extra ?? {}).slice(0, 2000),
        },
      ],
    });
    navigator.sendBeacon("/api/public/diag-report", payload);
  } catch {
    /* dijagnostika nikad ne sme da sruši stranicu */
  }
}

export function DashboardBeacon() {
  useEffect(() => {
    const host = window.location.hostname;
    if (!isPlatformHost(host) && host !== "localhost") return;

    send("dash-boot", {
      url: window.location.pathname + window.location.search,
    });

    const onError = (e: ErrorEvent) => {
      send("dash-error", {
        message: String(e.message).slice(0, 500),
        source: `${e.filename ?? "?"}:${e.lineno ?? 0}:${e.colno ?? 0}`,
        stack: e.error instanceof Error ? e.error.stack?.slice(0, 1500) : null,
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r: unknown = e.reason;
      send("dash-error", {
        type: "unhandledrejection",
        message:
          r instanceof Error
            ? r.message.slice(0, 500)
            : String(r).slice(0, 500),
        stack: r instanceof Error ? (r.stack?.slice(0, 1500) ?? null) : null,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    const t = setTimeout(() => send("dash-alive"), 5000);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      clearTimeout(t);
    };
  }, []);

  return null;
}
