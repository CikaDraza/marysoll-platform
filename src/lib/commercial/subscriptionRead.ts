import "server-only";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { Subscription } from "@/models/Subscription";
import { resolveCommercialSubscriptionState } from "@/helpers/commercial/resolveCommercialSubscriptionState";
import type { CommercialReadResult, CommercialSubscriptionRecord, CommercialTenantRecord } from "@/types/commercial-subscription";

const TENANT_FIELDS = "_id status plan paid planExpiresAt isTrialActive trialEndsAt verticals capabilityConfiguration";
const SUBSCRIPTION_FIELDS = "-_id tenantId plan status billingProvider currentPeriodEnd featureOverrides overrideExpiresAt";
const isTenantId = (id: string) => /^[a-f\d]{24}$/i.test(id);

/**
 * Internal DAL, not an access gate. SALES-2A must scope IDs before calling it.
 * Two lean allowlisted queries, one caller-supplied clock, zero repair/create.
 */
export async function readCommercialSubscriptions(tenantIds: readonly string[], now: Date): Promise<Map<string, CommercialReadResult>> {
  const requested = [...new Set(tenantIds)];
  const results = new Map<string, CommercialReadResult>();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    return new Map(requested.map((id) => [id, { kind: "invalid_input", reason: "invalid_now" }]));
  }
  const asOf = new Date(now.getTime()); // Preserve one snapshot even across async reads.
  const ids = [...new Set(requested.filter(isTenantId).map((id) => id.toLowerCase()))];
  for (const id of requested.filter((id) => !isTenantId(id))) {
    results.set(id, { kind: "invalid_input", reason: "invalid_tenant_id" });
  }
  if (ids.length === 0) return results;
  let tenants: CommercialTenantRecord[];
  let subscriptions: CommercialSubscriptionRecord[];
  try {
    await connectToDB();
    [tenants, subscriptions] = await Promise.all([
      Tenant.find({ _id: { $in: ids } }).select(TENANT_FIELDS).lean<CommercialTenantRecord[]>(),
      Subscription.find({ tenantId: { $in: ids } }).select(SUBSCRIPTION_FIELDS).lean<CommercialSubscriptionRecord[]>(),
    ]);
  } catch {
    for (const id of requested.filter(isTenantId)) results.set(id, { kind: "read_failure", reason: "source_read_failed" });
    return results;
  }
  const tenantById = new Map(tenants.map((tenant) => [tenant._id.toString(), tenant]));
  const subscriptionById = new Map(subscriptions.map((subscription) => [subscription.tenantId.toString(), subscription]));
  for (const requestedId of requested.filter(isTenantId)) {
    const id = requestedId.toLowerCase();
    const tenant = tenantById.get(id);
    if (!tenant) {
      results.set(requestedId, { kind: "not_found", tenantId: id });
      continue;
    }
    try {
      const value = resolveCommercialSubscriptionState({ tenantId: id, tenant, subscription: subscriptionById.get(id) ?? null, now: asOf });
      results.set(requestedId, { kind: "ok", value });
    } catch {
      results.set(requestedId, { kind: "read_failure", reason: "projection_failed" });
    }
  }
  return results;
}

/** Single and batch reads deliberately use the exact same persistence path. */
export async function readCommercialSubscription(tenantId: string, now: Date): Promise<CommercialReadResult> {
  const results = await readCommercialSubscriptions([tenantId], now);
  return results.get(tenantId)!;
}
