import "server-only";

// payments.webhook.stuck — dolazni webhook događaji koji nisu razrešeni.
//
// Zašto PLATFORM, a ne tenant: `WebhookEvent.tenantId` je namerno nullable —
// događaj se upisuje PRE nego što se tenant razreši, upravo zato da se ne bi
// gubio kada razrešavanje ne uspe. Zaglavljen zapis često i jeste onaj kome
// tenant nije određen, pa tenant-scoped provera ne bi videla najvažnije redove.
//
//  ERROR:   `failed` — obrada je pukla; pretplata salona je možda neusaglašena
//           sa Paddle-om (npr. plaćanje prošlo, plan nije podignut).
//  WARNING: `received` stariji od praga — ruta je upisala događaj pa pala pre
//           nego što ga je razrešila. Ne postoji sweeper koji ih preuzima.

import { WebhookEvent } from "@/models/WebhookEvent";
import { makeFinding } from "@/lib/platform/diagnostic-client";
import type { IntegrityFinding } from "@/lib/platform/diagnostic-client";
import type { PlatformIntegrityCollector } from "./types";

const KEY = "payments.webhook.stuck";
/** Ispod ovoga je događaj verovatno još u obradi, ne zaglavljen. */
const STALE_RECEIVED_MINUTES = 15;
const MAX_FINDINGS = 50;

interface WebhookRow {
  _id: unknown;
  provider?: string;
  providerEventId?: string;
  eventType?: string;
  status?: string;
  attempts?: number;
  lastError?: string | null;
  receivedAt?: Date;
  tenantId?: unknown;
}

export const collectWebhookStuck: PlatformIntegrityCollector = async () => {
  const staleBefore = new Date(Date.now() - STALE_RECEIVED_MINUTES * 60_000);

  const rows = (await WebhookEvent.find({
    $or: [
      { status: "failed" },
      { status: "received", receivedAt: { $lt: staleBefore } },
    ],
  })
    .select("provider providerEventId eventType status attempts lastError receivedAt tenantId")
    .sort({ receivedAt: -1 })
    .limit(MAX_FINDINGS)
    .lean()) as WebhookRow[];

  const scanned = await WebhookEvent.countDocuments({});

  const findings: IntegrityFinding[] = rows.map((row) => {
    const failed = row.status === "failed";
    const received = row.receivedAt
      ? new Date(row.receivedAt).toLocaleString("sr-RS")
      : "(nepoznato)";

    return makeFinding({
      checkKey: KEY,
      severity: failed ? "error" : "warning",
      subject: { model: "WebhookEvent", id: String(row._id) },
      message: failed
        ? `${row.provider}/${row.eventType}: obrada nije uspela (${row.attempts ?? 0}. pokušaj) — ${row.lastError ?? "bez poruke"}. Stanje pretplate može biti neusaglašeno sa provajderom.`
        : `${row.provider}/${row.eventType}: primljen ${received} i nikad razrešen — obrada je verovatno prekinuta.`,
      evidence: {
        provider: row.provider ?? null,
        providerEventId: row.providerEventId ?? null,
        eventType: row.eventType ?? null,
        status: row.status ?? null,
        attempts: row.attempts ?? 0,
        lastError: row.lastError ?? null,
        tenantResolved: Boolean(row.tenantId),
        receivedAt: row.receivedAt ? new Date(row.receivedAt).toISOString() : null,
      },
      repair: { action: "manual_investigation" },
    });
  });

  // error (neusaglašena naplata) pre warning (prekinuta obrada).
  findings.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
  );

  return { findings, scanned };
};
