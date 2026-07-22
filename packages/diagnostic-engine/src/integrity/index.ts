/**
 * @panta/diagnostic-engine/integrity — javni API druge porodice engine-a:
 * server-side data-integrity provere (Identity & Loyalty Health).
 *
 * Fizički odvojen entry od browser dijagnostike ("." entry): server kod ne
 * povlači window/collectore, browser bundle ne povlači integrity. Paket
 * poseduje kontrakt + registry + čiste evaluatore; Mongo kolektori (read-only)
 * žive u Marysoll app-u (src/lib/diagnostics/integrity) i konzumiraju ovo
 * kroz adapter lib/platform/diagnostic-client.ts.
 */

export type {
  IdLike,
  IntegritySeverity,
  IntegrityFinding,
  IntegrityCheckStatus,
  IntegrityCheckResult,
  IntegrityReport,
} from "./types";
export { FINDINGS_MAX, capMessage, capEvidence } from "./types";

export type { IntegrityCheckDefinition, IntegrityCheckKey } from "./registry";
export { INTEGRITY_CHECKS, getCheckDefinition } from "./registry";

export type {
  LedgerAmountRow,
  BalancePair,
  BalanceMismatch,
} from "./evaluate";
export {
  idStr,
  findMissingReferences,
  expectedBalancesFromLedger,
  compareBalances,
  maxSeverity,
  makeFinding,
  completedResult,
  failedResult,
  summarizeResults,
  buildReport,
  toModuleResult,
} from "./evaluate";
