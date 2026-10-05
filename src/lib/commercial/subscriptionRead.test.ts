import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/models/Tenant", () => ({ Tenant: { find: vi.fn(), create: vi.fn(), updateOne: vi.fn(), updateMany: vi.fn(), findOneAndUpdate: vi.fn(), bulkWrite: vi.fn(), insertMany: vi.fn(), deleteOne: vi.fn(), prototype: { save: vi.fn() } } }));
vi.mock("@/models/Subscription", () => ({ Subscription: { find: vi.fn(), create: vi.fn(), updateOne: vi.fn(), updateMany: vi.fn(), findOneAndUpdate: vi.fn(), bulkWrite: vi.fn(), insertMany: vi.fn(), deleteOne: vi.fn(), prototype: { save: vi.fn() } } }));
vi.mock("@/lib/plans/subscriptionService", () => { throw new Error("Commercial must never import write-capable Subscription services"); });

import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { Subscription } from "@/models/Subscription";
import { readCommercialSubscription, readCommercialSubscriptions } from "./subscriptionRead";

const first = "507f1f77bcf86cd799439011";
const second = "507f1f77bcf86cd799439012";
const now = new Date("2026-10-05T12:00:00Z");
const future = "2026-10-06T12:00:00.000Z";
const tenant = { _id: first, status: "active", plan: "kiki", paid: true, isTrialActive: false, trialEndsAt: null };

function query(value: unknown, reject = false) {
  const result = { select: vi.fn(), lean: vi.fn(async () => {
    if (reject) throw new Error("mongodb://secret/private/customer@example.test");
    return value;
  }) };
  result.select.mockReturnValue(result);
  return result;
}
function mockReads(tenants: unknown[] = [tenant], subscriptions: unknown[] = [], failSubscription = false) {
  const tenantQuery = query(tenants);
  const subscriptionQuery = query(subscriptions, failSubscription);
  vi.mocked(Tenant.find).mockReturnValue(tenantQuery as never);
  vi.mocked(Subscription.find).mockReturnValue(subscriptionQuery as never);
  return { tenantQuery, subscriptionQuery };
}
function expectNoWrites() {
  for (const model of [Tenant, Subscription]) {
    for (const method of ["create", "updateOne", "updateMany", "findOneAndUpdate", "bulkWrite", "insertMany", "deleteOne"] as const) {
      expect(model[method]).not.toHaveBeenCalled();
    }
    expect(model.prototype.save).not.toHaveBeenCalled();
  }
}

describe("Commercial read-only DAL", () => {
  beforeEach(() => vi.clearAllMocks());
  it("missing Subscription projects legacy state without creating or repairing records", async () => {
    const { tenantQuery, subscriptionQuery } = mockReads();
    const result = await readCommercialSubscription(first, now);
    expect(result).toMatchObject({ kind: "ok", value: { effectivePlan: "kiki", effectivePlanSource: "tenant_legacy", subscriptionStatus: null, billingProvider: null, currentPeriodEnd: null } });
    expect(tenantQuery.select).toHaveBeenCalledWith("_id status plan paid planExpiresAt isTrialActive trialEndsAt verticals capabilityConfiguration");
    expect(subscriptionQuery.select).toHaveBeenCalledWith("-_id tenantId plan status billingProvider currentPeriodEnd featureOverrides overrideExpiresAt");
    expect(tenantQuery.lean).toHaveBeenCalledTimes(1);
    expect(subscriptionQuery.lean).toHaveBeenCalledTimes(1);
    expectNoWrites();
  });
  it("single and batch return identical projections with one explicit clock", async () => {
    mockReads([tenant, { ...tenant, _id: second, isTrialActive: true, trialEndsAt: future }], [
      { tenantId: first, plan: "claudia", status: "active", billingProvider: "paddle", currentPeriodEnd: future },
    ]);
    const result = await readCommercialSubscriptions([first, second, first, first.toUpperCase(), "bad-id"], now);
    expect(Tenant.find).toHaveBeenCalledTimes(1);
    expect(Subscription.find).toHaveBeenCalledTimes(1);
    expect(Tenant.find).toHaveBeenCalledWith({ _id: { $in: [first, second] } });
    expect(Subscription.find).toHaveBeenCalledWith({ tenantId: { $in: [first, second] } });
    expect(result.get("bad-id")).toEqual({ kind: "invalid_input", reason: "invalid_tenant_id" });
    expect(result.get(first.toUpperCase())).toEqual(result.get(first));
    for (const id of [first, second]) {
      const single = await readCommercialSubscription(id, now);
      expect(result.get(id)).toEqual(single);
      expect(single).toMatchObject({ kind: "ok", value: { asOf: now.toISOString() } });
    }
    expectNoWrites();
  });
  it("freezes caller clock before asynchronous persistence reads", async () => {
    const clock = new Date(now);
    mockReads([tenant]);
    vi.mocked(connectToDB).mockImplementationOnce(async () => { clock.setTime(new Date(future).getTime()); return undefined as never; });
    expect(await readCommercialSubscription(first, clock)).toMatchObject({ kind: "ok", value: { asOf: now.toISOString() } });
    expectNoWrites();
  });
  it("missing Tenant is not_found, never a synthetic Maria success", async () => {
    mockReads([]);
    expect(await readCommercialSubscription(first, now)).toEqual({ kind: "not_found", tenantId: first });
    expectNoWrites();
  });
  it("Subscription query failure is not a successful legacy fallback", async () => {
    mockReads([tenant], [], true);
    const result = await readCommercialSubscription(first, now);
    expect(result).toEqual({ kind: "read_failure", reason: "source_read_failed" });
    expect(JSON.stringify(result)).not.toMatch(/secret|customer|mongodb/);
    expectNoWrites();
  });
  it("Tenant query failure remains typed and sanitized", async () => {
    mockReads();
    vi.mocked(Tenant.find).mockReturnValue(query([], true) as never);
    expect(await readCommercialSubscription(first, now)).toEqual({ kind: "read_failure", reason: "source_read_failed" });
    expectNoWrites();
  });
  it("connection failure remains typed and performs no queries or writes", async () => {
    mockReads();
    vi.mocked(connectToDB).mockRejectedValueOnce(new Error("secret"));
    expect(await readCommercialSubscription(first, now)).toEqual({ kind: "read_failure", reason: "source_read_failed" });
    expect(Tenant.find).not.toHaveBeenCalled();
    expectNoWrites();
  });
  it("skips persistence for empty, invalid IDs and invalid clock", async () => {
    expect(await readCommercialSubscriptions([], now)).toEqual(new Map());
    expect(await readCommercialSubscription("bad", now)).toEqual({ kind: "invalid_input", reason: "invalid_tenant_id" });
    expect(await readCommercialSubscription(first, new Date(NaN))).toEqual({ kind: "invalid_input", reason: "invalid_now" });
    expect(connectToDB).not.toHaveBeenCalled();
    expect(Tenant.find).not.toHaveBeenCalled();
    expect(Subscription.find).not.toHaveBeenCalled();
    expectNoWrites();
  });
  it("reads remain independent of DMD/network services", async () => {
    mockReads();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network unavailable"));
    try {
      expect(await readCommercialSubscription(first, now)).toMatchObject({ kind: "ok" });
      expect(fetchSpy).not.toHaveBeenCalled();
      expectNoWrites();
    } finally { fetchSpy.mockRestore(); }
  });
});
