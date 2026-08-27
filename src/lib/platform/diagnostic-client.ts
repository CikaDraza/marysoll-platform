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
  sendPerfBeacon,
  buildNetworkProbes,
  runNetworkProbe,
  runNetworkProbes,
  runLoginServiceProbe,
  runPasswordResetServiceProbe,
  runCollectors,
  runDiagnostics,
} from "@panta/diagnostic-engine";

export type {
  ModuleState,
  ModuleResult,
  DiagnosticReport,
  NetworkProbe,
} from "@panta/diagnostic-engine";

// ── Druga porodica: server-side data-integrity (Identity & Loyalty Health) ──
// Poseban package entry (./integrity) — kontrakt + registry + čisti evaluatori.
// Mongo kolektori žive u src/lib/diagnostics/integrity i uvoze paket ODAVDE.
export {
  INTEGRITY_CHECKS,
  getCheckDefinition,
  FINDINGS_MAX,
  makeFinding,
  completedResult,
  failedResult,
  buildReport,
  summarizeResults,
  findMissingReferences,
  expectedBalancesFromLedger,
  compareBalances,
  maxSeverity,
  toModuleResult,
} from "@panta/diagnostic-engine/integrity";

export type {
  IntegritySeverity,
  IntegrityFinding,
  IntegrityCheckStatus,
  IntegrityCheckResult,
  IntegrityReport,
  IntegrityCheckDefinition,
  IntegrityCheckKey,
  IntegrityCheckKeyForScope,
  IntegrityCheckScope,
  LedgerAmountRow,
  BalancePair,
  BalanceMismatch,
} from "@panta/diagnostic-engine/integrity";
