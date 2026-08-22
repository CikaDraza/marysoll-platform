import "server-only";

// seo.tenant.metadata (INFO/WARNING) — kvalitet javnih metapodataka salona.
// Saveti, ne greške: tenant sa slabim SEO profilom i dalje sme da objavi sajt.
// Čista procena živi uz SEO kod (src/lib/seo/health.ts); ovde je samo učitavanje
// profila i prevod u kontrakt integrity reporta.

import { makeFinding } from "@/lib/platform/diagnostic-client";
import { SalonProfile } from "@/models/SalonProfile";
import { evaluateSeoHealth } from "@/lib/seo/health";
import type { SalonProfileData } from "@/types";
import type { CollectorContext, CollectorOutput } from "./types";

const KEY = "seo.tenant.metadata";

export async function collectSeoHealth(
  ctx: CollectorContext,
): Promise<CollectorOutput> {
  const profile = await SalonProfile.findOne({ tenantId: ctx.tenantId })
    .lean<SalonProfileData | null>();

  const issues = evaluateSeoHealth(profile);

  const findings = issues.map((issue) =>
    makeFinding({
      checkKey: KEY,
      severity: issue.severity,
      subject: { model: "SalonProfile", id: profile?._id ?? ctx.tenantId },
      message: issue.message,
      evidence: { code: issue.code, hint: issue.hint },
    }),
  );

  // Provera gleda tačno jedan profil.
  return { findings, scanned: profile ? 1 : 0 };
}
