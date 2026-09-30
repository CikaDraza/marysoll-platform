/**
 * lib/plans/effectivePlans.ts
 *
 * SERVER-ONLY — batch varijanta resolveEffectivePlan za read-modele koji
 * obrađuju više tenanta odjednom (superadmin usage, istorija potrošnje).
 * Jedan Tenant i jedan Subscription upit za ceo skup, ista pravila kao
 * requireFeature i /api/subscriptions/features.
 */
import "server-only";

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Subscription } from "@/models/Subscription";
import { Tenant } from "@/models/Tenant";
import { resolveEffectivePlan, type PlanName } from "./planFeatures";

interface TenantPlanRecord {
  _id: { toString(): string };
  plan?: PlanName | null;
  paid?: boolean | null;
  planExpiresAt?: Date | null;
}

interface SubscriptionPlanRecord {
  tenantId: { toString(): string };
  plan?: PlanName | null;
  status?: string | null;
  billingProvider?: string | null;
  currentPeriodEnd?: Date | null;
}

/**
 * Vraća efektivni plan za svaki traženi tenant. Tenant koji ne postoji nije
 * u mapi — pozivalac odlučuje o fallback-u.
 */
export async function resolveEffectivePlansForTenants(
  tenantIds: string[],
  now: Date = new Date(),
): Promise<Map<string, PlanName>> {
  const ids = [...new Set(tenantIds)].filter((id) =>
    Types.ObjectId.isValid(id),
  );
  if (ids.length === 0) return new Map();

  await connectToDB();
  const [tenants, subscriptions] = await Promise.all([
    Tenant.find({ _id: { $in: ids } })
      .select("_id plan paid planExpiresAt")
      .lean<TenantPlanRecord[]>(),
    Subscription.find({ tenantId: { $in: ids } })
      .select("tenantId plan status billingProvider currentPeriodEnd")
      .lean<SubscriptionPlanRecord[]>(),
  ]);

  const subscriptionByTenantId = new Map(
    subscriptions.map((sub) => [sub.tenantId.toString(), sub]),
  );

  return new Map(
    tenants.map((tenant) => {
      const id = tenant._id.toString();
      return [
        id,
        resolveEffectivePlan(subscriptionByTenantId.get(id), tenant, now),
      ];
    }),
  );
}
