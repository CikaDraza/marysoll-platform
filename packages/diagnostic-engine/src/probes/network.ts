/**
 * Per-host network probes — reachability sa korisnikovog uređaja.
 *
 * Web ne može DNS lookup/ping/traceroute (iOS to daje samo native app-ovima) —
 * ali per-host reachability je dovoljna da se vidi KOJI host je blokiran i da
 * li je blokada u browser sloju ili šire.
 *
 * (Logika preseljena verbatim iz marysoll /dijagnostika stranice.)
 */
import type { ModuleResult } from "../types";

export interface NetworkProbe extends ModuleResult {
  url: string;
  /** no-cors za eksterne hostove bez CORS headera (opaque = konekcija radi) */
  noCors?: boolean;
}

export function buildNetworkProbes(
  baseDomain: string,
  hostname: string = window.location.hostname,
): NetworkProbe[] {
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocal) {
    return [
      {
        key: "local",
        name: "Lokalni server",
        url: `/api/public/ping`,
        state: "pending",
        ms: null,
        detail: null,
      },
    ];
  }

  const rand = Math.random().toString(36).slice(2, 8);
  return [
    {
      key: "base",
      name: "Marysoll sajt",
      url: `https://${baseDomain}/api/public/ping`,
      state: "pending",
      ms: null,
      detail: null,
    },
    {
      key: "admin",
      name: "Admin panel",
      url: `https://admin.${baseDomain}/api/public/ping`,
      state: "pending",
      ms: null,
      detail: null,
    },
    {
      key: "superadmin",
      name: "Superadmin",
      url: `https://superadmin.${baseDomain}/api/public/ping`,
      state: "pending",
      ms: null,
      detail: null,
    },
    {
      key: "wildcard",
      name: "Test subdomen",
      url: `https://probe-${rand}.${baseDomain}/api/public/ping`,
      state: "pending",
      ms: null,
      detail: null,
    },
    {
      key: "internet",
      name: "Internet (Google)",
      url: "https://www.gstatic.com/generate_204",
      noCors: true,
      state: "pending",
      ms: null,
      detail: null,
    },
  ];
}

export async function runNetworkProbe(
  p: NetworkProbe,
  timeoutMs = 8000,
): Promise<NetworkProbe> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(`${p.url}?cb=${Date.now()}`, {
      cache: "no-store",
      mode: p.noCors ? "no-cors" : "cors",
      signal: controller.signal,
    });
    const ms = Math.round(performance.now() - t0);
    // no-cors vraća opaque response (status 0) — sam uspeh fetch-a znači da je konekcija prošla
    const ok = p.noCors ? true : res.ok;
    return {
      ...p,
      state: ok ? "ok" : "fail",
      ms,
      detail: p.noCors ? "konekcija uspešna" : `HTTP ${res.status}`,
    };
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    const aborted = controller.signal.aborted;
    return {
      ...p,
      state: "fail",
      ms,
      detail: aborted
        ? `isteklo vreme (${Math.round(timeoutMs / 1000)}s) — konekcija se ne uspostavlja`
        : `konekcija odbijena/blokirana (${err instanceof Error ? err.name : "greška"})`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Sekvencijalno izvršavanje probe-ova — yield po završetku (za živi UI prikaz). */
export async function* runNetworkProbes(
  baseDomain: string,
): AsyncGenerator<NetworkProbe> {
  for (const p of buildNetworkProbes(baseDomain)) {
    yield await runNetworkProbe(p);
  }
}
