import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import {
  resolveEducationTaxonomy,
  taxonomyHasIntent,
  taxonomyHasTopic,
  type EducationIntentKey,
  type EducationTaxonomy,
  type EducationTopicKey,
} from "./taxonomy";

export async function resolveEducationTaxonomyForTenant(
  tenantId: string | null | undefined,
): Promise<EducationTaxonomy | null> {
  if (!tenantId) return null;
  await connectToDB();
  const tenant = await Tenant.findById(tenantId)
    .select("educationTaxonomyPreset")
    .lean<{ educationTaxonomyPreset?: unknown }>();
  return resolveEducationTaxonomy(tenant?.educationTaxonomyPreset);
}

export interface EducationClassification {
  topicKey?: EducationTopicKey;
  intentKey?: EducationIntentKey;
}

/** Crafted requests cannot attach values unsupported by this workspace. */
export async function validateEducationClassificationForTenant(
  tenantId: string,
  classification: { topicKey?: unknown; intentKey?: unknown },
): Promise<{ ok: true; taxonomy: EducationTaxonomy | null } | { ok: false; error: string }> {
  const taxonomy = await resolveEducationTaxonomyForTenant(tenantId);
  const hasAny =
    classification.topicKey !== undefined || classification.intentKey !== undefined;

  if (!taxonomy) {
    return hasAny
      ? { ok: false, error: "Taksonomija nije podešena za ovaj Edu workspace" }
      : { ok: true, taxonomy: null };
  }
  if (
    classification.topicKey !== undefined &&
    !taxonomyHasTopic(taxonomy, classification.topicKey)
  ) {
    return { ok: false, error: "Tema nije podržana u ovom Edu workspace-u" };
  }
  if (
    classification.intentKey !== undefined &&
    !taxonomyHasIntent(taxonomy, classification.intentKey)
  ) {
    return { ok: false, error: "Pristup teksta nije podržan u ovom Edu workspace-u" };
  }
  return { ok: true, taxonomy };
}
