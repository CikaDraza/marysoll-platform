import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import {
  INTEGRITY_CHECKS,
  completedResult,
  failedResult,
  summarizeResults,
} from "@/lib/platform/diagnostic-client";
import type { IntegrityCheckResult } from "@/lib/platform/diagnostic-client";
import { PLATFORM_INTEGRITY_COLLECTORS } from "./collectorRegistry";

export interface PlatformIntegrityRun {
  scope: "platform";
  ranAt: string;
  results: IntegrityCheckResult[];
  summary: ReturnType<typeof summarizeResults>;
}

/**
 * Read-only platform provere. Namerno nije vezano za tenant API/UI: rezultat
 * nema tenantId i orphan nalaz ostaje na stvarnom AuthUser subject-u.
 */
export async function runPlatformIntegrityChecks(): Promise<PlatformIntegrityRun> {
  await connectToDB();
  const results: IntegrityCheckResult[] = [];

  for (const def of INTEGRITY_CHECKS) {
    if (def.scope !== "platform") continue;
    const collector = PLATFORM_INTEGRITY_COLLECTORS[def.key];
    const start = Date.now();
    try {
      const { findings, scanned } = await collector();
      results.push(
        completedResult({ key: def.key, findings, scanned, ms: Date.now() - start }),
      );
    } catch (error) {
      console.error(`[integrity:platform] ${def.key} failed:`, error);
      results.push(
        failedResult({ key: def.key, error, ms: Date.now() - start }),
      );
    }
  }

  return {
    scope: "platform",
    ranAt: new Date().toISOString(),
    results,
    summary: summarizeResults(results),
  };
}
