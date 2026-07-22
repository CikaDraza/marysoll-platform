import "server-only";

// client.identity.mergedReferences (WARNING) — spojen nalog (mergedInto set)
// i dalje je primarni vlasnik aktivnih zapisa. Skenira svih 8 referenci koje
// merge premesta; nalaz po spojenom nalogu sa brojem referenci po modelu.

import { makeFinding } from "@/lib/platform/diagnostic-client";
import { USER_REF_MODELS } from "../refModels";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "client.identity.mergedReferences";

export async function collectMergedReferences(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const users = await ctx.loaders.users();
  const merged = users.filter((u) => u.mergedInto);
  if (merged.length === 0) return { findings: [], scanned: 0 };

  const mergedIds = merged.map((u) => u._id);

  // userId → { label → broj referenci }
  const refsByUser = new Map<string, Record<string, number>>();
  for (const { label, model, field } of USER_REF_MODELS) {
    const rows = await model
      .find({ tenantId: ctx.tenantId, [field]: { $in: mergedIds } })
      .select(field)
      .lean();
    for (const row of rows as Record<string, unknown>[]) {
      const userId = String(row[field]);
      const counts = refsByUser.get(userId) ?? {};
      counts[label] = (counts[label] ?? 0) + 1;
      refsByUser.set(userId, counts);
    }
  }

  const findings = merged
    .filter((u) => refsByUser.has(u._id))
    .map((u) => {
      const references = refsByUser.get(u._id)!;
      const total = Object.values(references).reduce((a, b) => a + b, 0);
      return makeFinding({
        checkKey: KEY,
        severity: "warning",
        subject: { model: "TenantUser", id: u._id },
        message: `Spojen nalog i dalje referenciran (${total} zapisa) — canonical je ${u.mergedInto}.`,
        evidence: { mergedInto: u.mergedInto, references },
        repair: {
          action: "reassign_to_canonical",
          params: { targetId: u.mergedInto! },
        },
      });
    });

  return { findings, scanned: merged.length };
}
