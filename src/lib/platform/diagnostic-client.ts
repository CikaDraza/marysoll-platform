/**
 * Diagnostic Client — platformski adapter za @panta/diagnostic-engine.
 *
 * App uvozi dijagnostiku SAMO odavde (isti obrazac kao tenant-client i
 * identity-client): danas je iza adaptera workspace paket u packages/,
 * sutra može biti Diagnostic Engine servis — potrošači se ne diraju.
 *
 * Storage reporta ostaje u Marysoll-u: /api/public/diag-report → DiagReport
 * model (TTL 30 dana); paket definiše samo kontrakt (DiagnosticReport).
 */
export {
  sendDiagBeacon,
  attachCrashReporter,
  buildNetworkProbes,
  runNetworkProbe,
  runNetworkProbes,
  runCollectors,
  runDiagnostics,
} from "@panta/diagnostic-engine";

export type {
  ModuleState,
  ModuleResult,
  DiagnosticReport,
  NetworkProbe,
} from "@panta/diagnostic-engine";
