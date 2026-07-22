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
import type { IntegrityCollector } from "./collectors/types";
import { collectDuplicates } from "./collectors/duplicates";
import { collectMergedReferences } from "./collectors/mergedReferences";
import { collectInvalidReferences } from "./collectors/invalidReferences";
import { collectAccountOrphans } from "./collectors/accountOrphans";
import { collectAccountDuplicates } from "./collectors/accountDuplicates";
import { collectLedgerMismatch } from "./collectors/ledgerMismatch";
import { collectBalanceMismatch } from "./collectors/balanceMismatch";
import { collectVoucherOwner } from "./collectors/voucherOwner";
import { collectAppointmentClient } from "./collectors/appointmentClient";
import { collectPushSubscriptions } from "./collectors/pushSubscriptions";

const COLLECTORS: Record<string, IntegrityCollector> = {
  "client.identity.duplicates": collectDuplicates,
  "client.identity.mergedReferences": collectMergedReferences,
  "client.identity.invalidReferences": collectInvalidReferences,
  "loyalty.account.orphans": collectAccountOrphans,
  "loyalty.account.duplicates": collectAccountDuplicates,
  "loyalty.ledger.mismatch": collectLedgerMismatch,
  "loyalty.balance.mismatch": collectBalanceMismatch,
  "voucher.owner.invalid": collectVoucherOwner,
  "appointment.client.invalid": collectAppointmentClient,
  "notifications.push.subscriptions": collectPushSubscriptions,
};

export async function runIntegrityChecks(
  tenantId: string,
): Promise<IntegrityReport> {
  await connectToDB();
  const loaders = createLoaders(tenantId);
  const results = [];

  // Redosled iz registry-ja (izvor istine) — i garancija da je svaki ključ pokriven.
  for (const def of INTEGRITY_CHECKS) {
    const collector = COLLECTORS[def.key];
    const start = Date.now();
    if (!collector) {
      results.push(
        failedResult({
          key: def.key,
          error: "Kolektor nije registrovan za ovu proveru.",
          ms: 0,
        }),
      );
      continue;
    }
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
