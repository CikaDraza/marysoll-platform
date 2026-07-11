import "server-only";

// loyalty.account.orphans — dve strane:
//  ERROR/WARNING: LoyaltyAccount pokazuje na nepostojećeg (error) / spojenog
//    (error) / suspendovanog (warning) korisnika.
//  INFO: aktivni klijenti bez loyalty naloga — JEDAN zbirni nalaz (nalog
//    nastaje automatski pri prvom događaju, per-user spisak bi bio šum), i to
//    samo ako salon uopšte ima loyalty config.
// Ozbiljniji nalazi idu prvi da ih FINDINGS_MAX cap nikad ne istisne.

import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { makeFinding } from "@/lib/platform/diagnostic-client";
import type { IntegrityFinding } from "@/lib/platform/diagnostic-client";
import { classifyUserRef, isActiveClient, refIssueLabel } from "../classify";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "loyalty.account.orphans";

export async function collectAccountOrphans(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const [accounts, index] = await Promise.all([
    ctx.loaders.accounts(),
    ctx.loaders.index(),
  ]);

  const findings: IntegrityFinding[] = [];

  for (const account of accounts) {
    const issue = classifyUserRef(account.tenantUserId, index);
    if (!issue) continue;
    const owner = index.get(account.tenantUserId);
    findings.push(
      makeFinding({
        checkKey: KEY,
        severity: issue === "suspended" ? "warning" : "error",
        subject: { model: "LoyaltyAccount", id: account._id },
        message: `Loyalty nalog pokazuje na korisnika ${account.tenantUserId}: ${refIssueLabel(issue)}.`,
        evidence: {
          tenantUserId: account.tenantUserId,
          issue,
          ...(owner?.mergedInto && { mergedInto: owner.mergedInto }),
        },
        repair:
          issue === "merged"
            ? {
                action: "reassign_to_canonical",
                params: { targetId: owner!.mergedInto! },
              }
            : { action: "manual_investigation" },
      }),
    );
  }
  // error pre warning — cap ne sme da istisne ozbiljnije
  findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));

  const hasConfig = await LoyaltyConfig.exists({ tenantId: ctx.tenantId });
  if (hasConfig) {
    const withAccount = new Set(accounts.map((a) => a.tenantUserId));
    const withoutAccount = [...index.values()].filter(
      (u) => isActiveClient(u) && !withAccount.has(u._id),
    ).length;
    if (withoutAccount > 0) {
      findings.push(
        makeFinding({
          checkKey: KEY,
          severity: "info",
          subject: { model: "TenantUser", id: "*" },
          message: `${withoutAccount} aktivnih klijenata bez loyalty naloga — nastaje automatski pri prvom događaju, nije potrebna akcija.`,
          evidence: { count: withoutAccount },
        }),
      );
    }
  }

  return { findings, scanned: accounts.length };
}
