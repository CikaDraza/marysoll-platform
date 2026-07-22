import "server-only";

// loyalty.balance.mismatch (WARNING) — keširana heartsBalance/pointsBalance
// polja se ne slažu sa zbirom iz ledgera (izvor istine). Očekivani balans
// računa ČISTI evaluator iz paketa (ogledalo recomputeAccount agregacije);
// repair je tačno recomputeAccount(accountId).

import {
  compareBalances,
  expectedBalancesFromLedger,
  makeFinding,
} from "@/lib/platform/diagnostic-client";
import { groupLedgerByAccount } from "../classify";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "loyalty.balance.mismatch";

export async function collectBalanceMismatch(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const [accounts, ledger] = await Promise.all([
    ctx.loaders.accounts(),
    ctx.loaders.ledger(),
  ]);

  const byAccount = groupLedgerByAccount(ledger);

  const findings = [];
  for (const account of accounts) {
    const computed = expectedBalancesFromLedger(byAccount.get(account._id) ?? []);
    const mismatch = compareBalances(
      { hearts: account.heartsBalance, points: account.pointsBalance },
      computed,
    );
    if (!mismatch) continue;
    findings.push(
      makeFinding({
        checkKey: KEY,
        severity: "warning",
        subject: { model: "LoyaltyAccount", id: account._id },
        message: "Keširan balans se ne slaže sa ledgerom (izvor istine).",
        evidence: { mismatch },
        repair: {
          action: "recomputeAccount",
          params: { accountId: account._id },
        },
      }),
    );
  }

  return { findings, scanned: accounts.length };
}
