import "server-only";

/**
 * Runner Identity & Loyalty Health provera — sekvencijalno (čist ms po
 * proveri, bez paralelnog pritiska na produkcionu bazu), svaka provera u
 * svom try/catch: greška kolektora → failedResult ("Provera nije izvršena"),
 * NIKAD tiho "0 problema". Read-only — nijedan kolektor ne piše u bazu.
 */

import { connectToDB } from "@/lib/db/mongodb";
import {
  INTEGRITY_CHECKS,
  buildReport,
  completedResult,
  failedResult,
} from "@/lib/platform/diagnostic-client";
import type { IntegrityReport } from "@/lib/platform/diagnostic-client";
import { createLoaders } from "./loaders";
import { TENANT_INTEGRITY_COLLECTORS } from "./collectorRegistry";

export async function runIntegrityChecks(
  tenantId: string,
): Promise<IntegrityReport> {
  await connectToDB();
  const loaders = createLoaders(tenantId);
  const results = [];

  // Redosled iz registry-ja (izvor istine); platform provere nemaju tenant
  // subject i zato se nikada ne izvršavaju niti lažno padaju u ovom reportu.
  for (const def of INTEGRITY_CHECKS) {
    if (def.scope !== "tenant") continue;
    const collector = TENANT_INTEGRITY_COLLECTORS[def.key];
    const start = Date.now();
    try {
      const { findings, scanned } = await collector({ tenantId, loaders });
      results.push(
        completedResult({ key: def.key, findings, scanned, ms: Date.now() - start }),
      );
    } catch (err) {
      console.error(`[integrity] ${def.key} failed:`, err);
      results.push(
        failedResult({ key: def.key, error: err, ms: Date.now() - start }),
      );
    }
  }

  return buildReport({ tenantId, results });
}
