import "server-only";

// loyalty.account.duplicates (WARNING) — više od jednog LoyaltyAccount po
// korisniku (krši unique {tenantId, tenantUserId}; može nastati samo mimo
// aplikacije, npr. ručnim upisom — zato provera postoji).

import { makeFinding } from "@/lib/platform/diagnostic-client";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "loyalty.account.duplicates";

export async function collectAccountDuplicates(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const accounts = await ctx.loaders.accounts();

  const byUser = new Map<string, string[]>();
  for (const account of accounts) {
    const arr = byUser.get(account.tenantUserId) ?? [];
    arr.push(account._id);
    byUser.set(account.tenantUserId, arr);
  }

  const findings = [...byUser.entries()]
    .filter(([, accountIds]) => accountIds.length > 1)
    .map(([tenantUserId, accountIds]) =>
      makeFinding({
        checkKey: KEY,
        severity: "warning",
        subject: { model: "TenantUser", id: tenantUserId },
        message: `Korisnik ima ${accountIds.length} loyalty naloga — mora tačno jedan.`,
        evidence: { accountIds },
        repair: { action: "merge_ledger_then_recompute" },
      }),
    );

  return { findings, scanned: accounts.length };
}
