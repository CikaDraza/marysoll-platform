/**
 * Čisti evaluatori i sklapanje rezultata — bez Mongo/IO. App kolektori rade
 * upite (read-only) i hrane ove funkcije lean redovima.
 *
 * Sve funkcije su deterministične; sklapanje rezultata garantuje razliku
 * između "provera prošla, 0 nalaza" i "provera NIJE izvršena" (failedResult).
 */

import type { ModuleResult, ModuleState } from "../types";
import { getCheckDefinition } from "./registry";
import {
  FINDINGS_MAX,
  capEvidence,
  capMessage,
  type IdLike,
  type IntegrityCheckResult,
  type IntegrityFinding,
  type IntegrityReport,
  type IntegritySeverity,
} from "./types";

export function idStr(id: IdLike): string {
  return typeof id === "string" ? id : String(id);
}

/**
 * Reference kojih nema u skupu postojećih id-jeva (dedupe očuvan redosled).
 * Osnova za invalidReferences / orphans provere: kolektor prosledi id-jeve
 * koje domenski zapisi referenciraju + id-jeve koji stvarno postoje.
 */
export function findMissingReferences(
  referenced: Iterable<IdLike>,
  existing: Iterable<IdLike>,
): string[] {
  const existingSet = new Set<string>();
  for (const id of existing) existingSet.add(idStr(id));
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const id of referenced) {
    const s = idStr(id);
    if (existingSet.has(s) || seen.has(s)) continue;
    seen.add(s);
    missing.push(s);
  }
  return missing;
}

export interface LedgerAmountRow {
  currency: string;
  amount: number;
}

/**
 * Očekivani balans iz ledger redova — ogledalo recomputeAccount agregacije
 * (SUM(amount) po valuti; iznosi su signed). Nepoznate valute se ignorišu.
 */
export function expectedBalancesFromLedger(
  entries: Iterable<LedgerAmountRow>,
): { hearts: number; points: number } {
  let hearts = 0;
  let points = 0;
  for (const e of entries) {
    const amount = Number(e.amount) || 0;
    if (e.currency === "hearts") hearts += amount;
    else if (e.currency === "points") points += amount;
  }
  return { hearts, points };
}

export interface BalancePair {
  hearts: number;
  points: number;
}

export interface BalanceMismatch {
  hearts?: { stored: number; computed: number };
  points?: { stored: number; computed: number };
}

/** null = balansi se slažu; inače samo valute koje odstupaju. */
export function compareBalances(
  stored: BalancePair,
  computed: BalancePair,
): BalanceMismatch | null {
  const mismatch: BalanceMismatch = {};
  if (stored.hearts !== computed.hearts) {
    mismatch.hearts = { stored: stored.hearts, computed: computed.hearts };
  }
  if (stored.points !== computed.points) {
    mismatch.points = { stored: stored.points, computed: computed.points };
  }
  return mismatch.hearts || mismatch.points ? mismatch : null;
}

const SEVERITY_RANK: Record<IntegritySeverity, number> = {
  error: 3,
  warning: 2,
  info: 1,
};

/** Najviši severity među nalazima; null za prazan skup. */
export function maxSeverity(
  findings: readonly IntegrityFinding[],
): IntegritySeverity | null {
  let top: IntegritySeverity | null = null;
  for (const f of findings) {
    if (!top || SEVERITY_RANK[f.severity] > SEVERITY_RANK[top]) {
      top = f.severity;
    }
  }
  return top;
}

/** Nalaz sa primenjenim cap-ovima (message/evidence) i normalizovanim id-jem. */
export function makeFinding(input: {
  checkKey: string;
  severity: IntegritySeverity;
  subject: { model: string; id: IdLike };
  message: string;
  evidence?: Record<string, unknown>;
  repair?: { action: string; params?: Record<string, string> };
}): IntegrityFinding {
  const finding: IntegrityFinding = {
    checkKey: input.checkKey,
    severity: input.severity,
    subject: { model: input.subject.model, id: idStr(input.subject.id) },
    message: capMessage(input.message),
  };
  if (input.evidence) finding.evidence = capEvidence(input.evidence);
  if (input.repair) finding.repair = input.repair;
  return finding;
}

/**
 * Rezultat IZVRŠENE provere: findings se seku na FINDINGS_MAX, totalFindings
 * čuva pravi broj, severity = najviši među SVIM nalazima (pre odsecanja).
 */
export function completedResult(input: {
  key: string;
  findings: IntegrityFinding[];
  scanned?: number | null;
  ms: number;
}): IntegrityCheckResult {
  const def = getCheckDefinition(input.key);
  return {
    key: def.key,
    name: def.name,
    status: "completed",
    severity: maxSeverity(input.findings),
    findings: input.findings.slice(0, FINDINGS_MAX),
    totalFindings: input.findings.length,
    scanned: input.scanned ?? null,
    ms: input.ms,
    error: null,
  };
}

/**
 * Provera NIJE izvršena (greška kolektora) — nikad ne sme da liči na
 * "0 problema": status je "failed", bez nalaza i bez zaključka o podacima.
 */
export function failedResult(input: {
  key: string;
  error: unknown;
  ms: number;
}): IntegrityCheckResult {
  const def = getCheckDefinition(input.key);
  const message =
    input.error instanceof Error
      ? input.error.message
      : String(input.error ?? "Nepoznata greška");
  return {
    key: def.key,
    name: def.name,
    status: "failed",
    severity: null,
    findings: [],
    totalFindings: 0,
    scanned: null,
    ms: input.ms,
    error: capMessage(`Provera nije izvršena: ${message}`),
  };
}

/** Broji PROVERE po najvišem severity-ju + neizvršene (stabilno uz findings cap). */
export function summarizeResults(
  results: readonly IntegrityCheckResult[],
): IntegrityReport["summary"] {
  const summary = { errors: 0, warnings: 0, infos: 0, failedChecks: 0 };
  for (const r of results) {
    if (r.status === "failed") summary.failedChecks += 1;
    else if (r.severity === "error") summary.errors += 1;
    else if (r.severity === "warning") summary.warnings += 1;
    else if (r.severity === "info") summary.infos += 1;
  }
  return summary;
}

/** Kompletan report iz rezultata (redosled iz registry-ja održava kolektor/runner). */
export function buildReport(input: {
  tenantId: IdLike;
  results: IntegrityCheckResult[];
  ranAt?: Date;
}): IntegrityReport {
  return {
    tenantId: idStr(input.tenantId),
    ranAt: (input.ranAt ?? new Date()).toISOString(),
    results: input.results,
    summary: summarizeResults(input.results),
  };
}

const STATE_BY_SEVERITY: Record<IntegritySeverity, ModuleState> = {
  error: "fail",
  warning: "warn",
  info: "info",
};

/**
 * Most ka browser-diagnostics kontraktu — DijagnostikaTab renderuje obe
 * porodice istim UI-jem. Neizvršena provera je "fail" sa jasnim detail-om,
 * zdrava provera "ok".
 */
export function toModuleResult(result: IntegrityCheckResult): ModuleResult {
  if (result.status === "failed") {
    return {
      key: result.key,
      name: result.name,
      state: "fail",
      ms: result.ms,
      detail: result.error,
      data: { status: "failed" },
    };
  }
  return {
    key: result.key,
    name: result.name,
    state: result.severity ? STATE_BY_SEVERITY[result.severity] : "ok",
    ms: result.ms,
    detail:
      result.totalFindings > 0
        ? `${result.totalFindings} nalaz(a)`
        : "Bez nalaza",
    data: {
      status: result.status,
      totalFindings: result.totalFindings,
      scanned: result.scanned,
    },
  };
}
