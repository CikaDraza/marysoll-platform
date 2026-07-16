/**
 * sendPerfBeacon — pasivno pošalje performanse STRANICE (load timing + LCP +
 * resursi + in-app kontekst) sa uređaja korisnika, bez ikakve interakcije.
 *
 * Za salon (TenantSiteBeacon): kad klijentkinja otvori salon (npr. u Instagram
 * in-app pregledaču), dobijamo PRAVE brojke baš te strane — za razliku od
 * /dijagnostika stranice koja meri samu sebe. Čita se u superadmin →
 * Dijagnostika (label "{scope}-perf").
 *
 * Zvati posle ~5–6s (da LCP i load event slegnu). Nikad ne baca (types.ts #1).
 */
import { sendDiagBeacon } from "./beacon";
import {
  collectLoadTiming,
  collectLcp,
  collectResources,
} from "./collectors/performance";
import { detectInApp } from "./collectors/browser";

export async function sendPerfBeacon(
  scope: string,
  opts: { endpoint?: string } = {},
): Promise<void> {
  try {
    const timing = collectLoadTiming();
    const lcp = await collectLcp();
    const resources = collectResources();
    sendDiagBeacon(
      `${scope}-perf`,
      {
        inApp: detectInApp(navigator.userAgent),
        timing: timing.data,
        lcp: lcp.data,
        resources: resources.data,
      },
      opts.endpoint,
    );
  } catch {
    /* dijagnostika nikad ne sme da sruši stranicu */
  }
}
