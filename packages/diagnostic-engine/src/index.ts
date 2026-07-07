/**
 * @panta/diagnostic-engine — javni API.
 *
 * Klijentska dijagnostika: collectori (device/push/storage/permissions),
 * per-host network probes, crash beacon. Čist TypeScript + browser API-ji —
 * bez React-a, Next-a i baze. Storage reporta je odgovornost potrošača
 * (Marysoll: /api/public/diag-report → DiagReport model).
 */

export type {
  ModuleState,
  ModuleResult,
  DiagnosticReport,
} from "./types";
export { DETAIL_MAX, DATA_JSON_MAX, capDetail, capData } from "./types";

export { sendDiagBeacon } from "./beacon";
export { attachCrashReporter } from "./crash";
export type { CrashReporterOptions } from "./crash";

export type { NetworkProbe } from "./probes/network";
export {
  buildNetworkProbes,
  runNetworkProbe,
  runNetworkProbes,
} from "./probes/network";

export { collectDevice } from "./collectors/device";
export { collectPushSupport } from "./collectors/push";
export { collectStorage } from "./collectors/storage";
export { collectPermissions } from "./collectors/permissions";

import type { DiagnosticReport, ModuleResult } from "./types";
import { collectDevice } from "./collectors/device";
import { collectPushSupport } from "./collectors/push";
import { collectStorage } from "./collectors/storage";
import { collectPermissions } from "./collectors/permissions";
import { runNetworkProbes } from "./probes/network";

/** Svi collectori redom; svaki interno hvata svoje greške (nikad ne baca). */
export async function runCollectors(): Promise<ModuleResult[]> {
  return [
    collectDevice(),
    collectPushSupport(),
    await collectStorage(),
    await collectPermissions(),
  ];
}

/** Kompletna dijagnostika: network probes + collectori → DiagnosticReport. */
export async function runDiagnostics(opts: {
  baseDomain: string;
  label?: string | null;
}): Promise<DiagnosticReport> {
  const results: ModuleResult[] = [];
  for await (const probe of runNetworkProbes(opts.baseDomain)) {
    results.push(probe);
  }
  results.push(...(await runCollectors()));
  return {
    label: opts.label ?? null,
    pageHost: window.location.host,
    results,
  };
}
