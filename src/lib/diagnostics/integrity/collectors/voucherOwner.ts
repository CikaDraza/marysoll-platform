import "server-only";

// voucher.owner.invalid (WARNING) — vlasnik AKTIVNOG/REZERVISANOG vaučera ne
// postoji, spojen je ili suspendovan → "klijent ima vaučer, ali ga ne vidi".
// ownerTenantUserId=null je LEGITIMAN (nezatražen gift/share vaučer) — preskače
// se. Istorijski statusi (redeemed/expired/revoked) nisu akcioni → van opsega.

import { Voucher } from "@/models/Voucher";
import { makeFinding } from "@/lib/platform/diagnostic-client";
import type { IntegrityFinding } from "@/lib/platform/diagnostic-client";
import { classifyUserRef, refIssueLabel } from "../classify";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "voucher.owner.invalid";

export async function collectVoucherOwner(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const index = await ctx.loaders.index();

  const vouchers = await Voucher.find({
    tenantId: ctx.tenantId,
    status: { $in: ["active", "reserved"] },
  })
    .select("ownerTenantUserId giftedByTenantUserId status code")
    .lean();

  const findings: IntegrityFinding[] = [];

  for (const raw of vouchers as Record<string, unknown>[]) {
    const voucherId = String(raw._id);
    const status = String(raw.status ?? "");
    const code = String(raw.code ?? "");

    for (const field of ["ownerTenantUserId", "giftedByTenantUserId"] as const) {
      if (!raw[field]) continue; // null owner = nezatražen poklon; giftedBy opciono
      const userId = String(raw[field]);
      const issue = classifyUserRef(userId, index);
      if (!issue) continue;
      const user = index.get(userId);
      findings.push(
        makeFinding({
          checkKey: KEY,
          severity: "warning",
          subject: { model: "Voucher", id: voucherId },
          message: `Vaučer ${code} (${status}): ${field === "ownerTenantUserId" ? "vlasnik" : "poklonodavac"} ${userId} — ${refIssueLabel(issue)}.`,
          evidence: {
            code,
            voucherStatus: status,
            field,
            userId,
            issue,
            ...(user?.mergedInto && { expectedOwner: user.mergedInto }),
          },
          repair:
            issue === "merged"
              ? {
                  action: "reassign_to_canonical",
                  params: { targetId: user!.mergedInto! },
                }
              : { action: "manual_investigation" },
        }),
      );
    }
  }

  return { findings, scanned: vouchers.length };
}
