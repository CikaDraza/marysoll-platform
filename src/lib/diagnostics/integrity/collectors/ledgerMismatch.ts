import "server-only";

// loyalty.ledger.mismatch (ERROR) — ledger unos čiji se tenantUserId ne slaže
// sa nalogom na koji pokazuje, ili pokazuje na nalog koga nema u ovom tenantu
// (obrisan/tuđ). Grupisano po (accountId, tenantUserId) paru da jedan pokvaren
// nalog ne proizvede stotine identičnih nalaza.

import { makeFinding } from "@/lib/platform/diagnostic-client";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "loyalty.ledger.mismatch";

export async function collectLedgerMismatch(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const [accounts, ledger] = await Promise.all([
    ctx.loaders.accounts(),
    ctx.loaders.ledger(),
  ]);

  const accountOwner = new Map(accounts.map((a) => [a._id, a.tenantUserId]));

  // `${accountId}|${tenantUserId}` → { count, issue }
  const problems = new Map<
    string,
    { accountId: string; tenantUserId: string; count: number; issue: "missing_account" | "owner_mismatch"; expectedOwner?: string }
  >();

  for (const entry of ledger) {
    const owner = accountOwner.get(entry.accountId);
    let issue: "missing_account" | "owner_mismatch" | null = null;
    if (owner === undefined) issue = "missing_account";
    else if (owner !== entry.tenantUserId) issue = "owner_mismatch";
    if (!issue) continue;

    const key = `${entry.accountId}|${entry.tenantUserId}`;
    const existing = problems.get(key);
    if (existing) existing.count += 1;
    else {
      problems.set(key, {
        accountId: entry.accountId,
        tenantUserId: entry.tenantUserId,
        count: 1,
        issue,
        ...(issue === "owner_mismatch" && { expectedOwner: owner }),
      });
    }
  }

  const findings = [...problems.values()].map((p) =>
    makeFinding({
      checkKey: KEY,
      severity: "error",
      subject: { model: "LoyaltyAccount", id: p.accountId },
      message:
        p.issue === "missing_account"
          ? `${p.count} ledger unos(a) pokazuje na nepostojeći/tuđ nalog ${p.accountId}.`
          : `${p.count} ledger unos(a) korisnika ${p.tenantUserId} knjiži se na nalog čiji je vlasnik ${p.expectedOwner} — balans ide pogrešnom klijentu.`,
      evidence: {
        accountId: p.accountId,
        ledgerTenantUserId: p.tenantUserId,
        ...(p.expectedOwner && { accountTenantUserId: p.expectedOwner }),
        entries: p.count,
        issue: p.issue,
      },
      repair: { action: "reassign_ledger_then_recompute" },
    }),
  );

  return { findings, scanned: ledger.length };
}
