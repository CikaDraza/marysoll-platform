import "server-only";

// client.identity.invalidReferences (ERROR) — domenski zapisi pokazuju na
// korisnika koga NEMA u ovom tenantu (obrisan ili pogrešan tenant — iz
// tenant-scoped perspektive nerazlučivo, poruka to pošteno kaže).

import { makeFinding } from "@/lib/platform/diagnostic-client";
import { classifyUserRef } from "../classify";
import { USER_REF_MODELS } from "../refModels";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "client.identity.invalidReferences";

export async function collectInvalidReferences(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const index = await ctx.loaders.index();

  // missingId → labeli modela koji ga referenciraju
  const missingRefs = new Map<string, string[]>();
  let scanned = 0;

  for (const { label, model, field } of USER_REF_MODELS) {
    const ids: unknown[] = await model.distinct(field, {
      tenantId: ctx.tenantId,
    });
    for (const raw of ids) {
      if (!raw) continue; // opciona polja (giftedBy, profileId) — null je legitiman
      scanned += 1;
      const id = String(raw);
      if (classifyUserRef(id, index) !== "missing") continue;
      const labels = missingRefs.get(id) ?? [];
      if (!labels.includes(label)) labels.push(label);
      missingRefs.set(id, labels);
    }
  }

  const findings = [...missingRefs.entries()].map(([id, models]) =>
    makeFinding({
      checkKey: KEY,
      severity: "error",
      subject: { model: "TenantUser", id },
      message: `Referenciran korisnik ne postoji u ovom salonu (${models.join(", ")}).`,
      evidence: { models },
      repair: { action: "manual_investigation" },
    }),
  );

  return { findings, scanned };
}
