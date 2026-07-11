/**
 * Kontrakt server-side data-integrity provera (Identity & Loyalty Health).
 *
 * Druga porodica Diagnostic Engine-a, fizički odvojena od browser dijagnostike
 * (poseban entry `@panta/diagnostic-engine/integrity`). Paket poseduje kontrakt,
 * registry provera i čiste evaluatore — Mongo upiti (kolektori) žive u app-u
 * i hrane evaluatore lean redovima (isti pure-vs-DB obrazac kao loyalty-engine).
 *
 * KLJUČNO PRAVILO KONTRAKTA (zaključano 2026-07-11): nalaz provere i greška
 * kolektora su ODVOJENI pojmovi. Ako kolektor pukne (query nije uspeo),
 * rezultat je `status: "failed"` sa razlogom — NIKAD ne sme da izgleda kao
 * "0 problema".
 */

import { capDetail, capData } from "../types";

/** Id bez mongoose zavisnosti — string ili bilo šta sa toString() (ObjectId). */
export type IdLike = string | { toString(): string };

export type IntegritySeverity = "error" | "warning" | "info";

export interface IntegrityFinding {
  /** Ključ provere iz registry-ja (npr. "loyalty.balance.mismatch"). */
  checkKey: string;
  /** Severity KONKRETNOG nalaza — provera sme da meša (orphans: ERROR/INFO). */
  severity: IntegritySeverity;
  /** Na koji red podataka se nalaz odnosi. */
  subject: { model: string; id: string };
  /** Ljudski opis problema — uvek ograničen (MESSAGE cap). */
  message: string;
  /** Strukturirani dokaz (id-jevi, brojevi) — ograničen (EVIDENCE cap). */
  evidence?: Record<string, unknown>;
  /** Preporučena repair akcija za OVAJ nalaz (read-only faza: samo preporuka). */
  repair?: { action: string; params?: Record<string, string> };
}

/**
 * "completed" = provera je izvršena (findings može biti i prazan = zdravo);
 * "failed"    = provera NIJE izvršena (greška kolektora) — bez zaključka o podacima.
 */
export type IntegrityCheckStatus = "completed" | "failed";

export interface IntegrityCheckResult {
  key: string;
  /** Ljudski naziv iz registry-ja. */
  name: string;
  status: IntegrityCheckStatus;
  /** Najviši severity među nalazima; null = nema nalaza ili provera nije izvršena. */
  severity: IntegritySeverity | null;
  /** Nalazi — ograničeno na FINDINGS_MAX (totalFindings nosi pravi broj). */
  findings: IntegrityFinding[];
  /** Ukupan broj nalaza PRE odsecanja (>= findings.length). */
  totalFindings: number;
  /** Koliko je redova skenirano (kada kolektor to zna), inače null. */
  scanned: number | null;
  ms: number;
  /** Razlog zašto provera nije izvršena — postavljen SAMO uz status "failed". */
  error: string | null;
}

export interface IntegrityReport {
  tenantId: string;
  /** ISO timestamp pokretanja. */
  ranAt: string;
  results: IntegrityCheckResult[];
  /** Broj PROVERA po najvišem severity-ju + neizvršene (ne broj nalaza — stabilno uz cap). */
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    failedChecks: number;
  };
}

/** Tvrdi cap-ovi — report ide kroz API i UI, ne sme da eksplodira na velikom tenantu. */
export const FINDINGS_MAX = 50;

export function capMessage(message: string): string {
  return capDetail(message) ?? "";
}

export function capEvidence(
  evidence: Record<string, unknown>,
): Record<string, unknown> {
  return capData(evidence);
}
