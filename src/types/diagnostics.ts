/**
 * DTO tipovi za superadmin Dijagnostika tab (čitanje DiagReport kolekcije).
 * Oblik `results` je ModuleResult[] iz @panta/diagnostic-engine (kontrakt);
 * stari reporti (pre paketa) imaju kompatibilan podskup polja.
 */
import type { ModuleResult } from "@panta/diagnostic-engine";

/** Sentinel za reportove bez oznake (label === null) u select value / query param. */
export const DIAG_NULL_LABEL = "__NULL__";

export interface DiagLabelSummary {
  /** null = reportovi bez ?u= oznake */
  label: string | null;
  count: number;
  /** ISO timestamp poslednjeg reporta za ovu oznaku */
  lastAt: string;
}

export interface DiagReportDTO {
  _id: string;
  label: string | null;
  userAgent: string | null;
  ip: string | null;
  country: string | null;
  pageHost: string | null;
  results: ModuleResult[] | null;
  createdAt: string;
}

export interface DiagLabelsResponse {
  labels: DiagLabelSummary[];
}

export interface DiagReportsResponse {
  reports: DiagReportDTO[];
}
