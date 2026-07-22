import "server-only";

/**
 * Zajednički oblik kolektora: vraća SAMO nalaze + broj skeniranih redova.
 * Merenje vremena, completedResult/failedResult (greška ≠ "0 problema") i
 * sklapanje reporta radi runner — kolektor sme slobodno da baci grešku.
 */

import type { IntegrityFinding } from "@/lib/platform/diagnostic-client";
import type { IntegrityLoaders } from "../loaders";

export interface CollectorContext {
  tenantId: string;
  loaders: IntegrityLoaders;
}

export interface CollectorOutput {
  findings: IntegrityFinding[];
  /** Koliko je redova provera obišla (null kada nema smisla). */
  scanned: number | null;
}

export type IntegrityCollector = (
  ctx: CollectorContext,
) => Promise<CollectorOutput>;
