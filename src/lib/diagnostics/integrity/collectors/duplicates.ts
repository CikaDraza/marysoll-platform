import "server-only";

// client.identity.duplicates (INFO) — isti normalizovani telefon na ≥2 naloga
// sa bar jednim GOSTOM. Reuse stabilnog helpera groupDuplicatesByPhone (4b);
// već spojeni nalozi se preskaču da se ne prijavljuju rešeni parovi.

import { groupDuplicatesByPhone } from "@/lib/users/groupDuplicates";
import { makeFinding } from "@/lib/platform/diagnostic-client";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "client.identity.duplicates";

export async function collectDuplicates(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const users = await ctx.loaders.users();
  const candidates = users.filter(
    (u) => (u.role === "USER" || u.role === "GUEST") && !u.mergedInto,
  );

  const groups = groupDuplicatesByPhone(candidates);

  const findings = groups.map((group) =>
    makeFinding({
      checkKey: KEY,
      severity: "info",
      subject: { model: "TenantUser", id: group.accounts[0]._id },
      message: `${group.accounts.length} naloga sa istim telefonom (${group.key}) — kandidati za merge.`,
      evidence: {
        phone: group.key,
        accounts: group.accounts.map((a) => ({
          id: a._id,
          role: a.role,
          name: a.name ?? "",
        })),
      },
      repair: { action: "admin_merge_review" },
    }),
  );

  return { findings, scanned: candidates.length };
}
