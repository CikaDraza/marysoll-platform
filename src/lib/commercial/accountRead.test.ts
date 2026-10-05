import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/commercial/subscriptionRead", () => ({ readCommercialSubscriptions: vi.fn() }));
vi.mock("@/lib/plans/subscriptionService", () => { throw Error("write-capable service forbidden"); });
vi.mock("@/lib/newsletterService", () => { throw Error("Newsletter transport forbidden"); });
import { readCommercialSubscriptions } from "./subscriptionRead";
import { createCommercialAccountReader } from "./accountRead";
import { createCommercialPolicy } from "./policy";
import { createCommercialCursorCodec } from "./cursor";
import { commercialAccountDtoSchema, commercialListDtoSchema } from "@/types/commercial";
import { config, createCommercialFixture, NOW, FUTURE, TENANT_A, TENANT_B } from "./commercial.fixtures";

function setup() {
  const f = createCommercialFixture();
  const policy = createCommercialPolicy(f.ports, config);
  const cursor = createCommercialCursorCodec(new Uint8Array(32).fill(7));
  const reader = createCommercialAccountReader({ policy, cursor, now: f.now, readSubscriptions: f.readSubscriptions });
  return { ...f, policy, cursor, reader };
}

describe("Commercial assigned list/detail read service", () => {
  it("lists assigned tenants with one DAL batch and preserves SALES-1 Paddle parity", async () => {
    const f = setup(); const result = await f.reader.list(f.credential, {});
    expect(result.kind).toBe("ok"); if (result.kind !== "ok") return;
    expect(commercialListDtoSchema.safeParse(result.value).success).toBe(true);
    expect(result.value.items.map((item) => item.tenantId)).toEqual([TENANT_A, TENANT_B]);
    expect(f.readSubscriptions).toHaveBeenCalledExactlyOnceWith([TENANT_A, TENANT_B], NOW);
    expect(f.ports.identity.verify).toHaveBeenCalledTimes(2);
    for (const item of result.value.items) {
      expect(item.product).toMatchObject({ state: "ready", value: { tenantStatus: "suspended",
        effectivePlan: "claudia", effectivePlanSource: "subscription", currentPeriodEnd: null, quality: { state: "partial" }, price: { amount: null } } });
      expect(item.allowedActions).toEqual(["account.read", "subscription.read"]);
      for (const source of Object.values(item.modules)) expect(source).toEqual({ state: "unavailable", reason: "not_implemented", asOf: NOW.toISOString() });
    }
  });
  it("uses SALES-1 as the default DAL and scopes every passed ID", async () => {
    const f = setup(); vi.mocked(readCommercialSubscriptions).mockImplementationOnce(f.readSubscriptions);
    const reader = createCommercialAccountReader({ policy: f.policy, cursor: f.cursor, now: f.now });
    expect(await reader.detail(f.credential, "binding-a")).toMatchObject({ kind: "ok" });
    expect(readCommercialSubscriptions).toHaveBeenLastCalledWith([TENANT_A], NOW);
  });
  it("detail and filtered list share the same DTO", async () => {
    const f = setup();
    const detail = await f.reader.detail(f.credential, "binding-a");
    const list = await f.reader.list(f.credential, { dmdAccountId: "account-a" });
    if (detail.kind !== "ok" || list.kind !== "ok") throw Error("fixture denied");
    expect(detail.value).toEqual(list.value.items[0]);
    expect(commercialAccountDtoSchema.safeParse(detail.value).success).toBe(true);
  });
  it("assigned A cannot read B by list filter, binding, tenant, slug or guessed key", async () => {
    const f = setup(); f.state.assignments = [f.state.assignments[0]];
    expect(await f.reader.list(f.credential, { dmdAccountId: "account-b" })).toMatchObject({ kind: "ok", value: { items: [] } });
    for (const target of ["binding-b", TENANT_B, "salon-b", "customer@example.test"]) {
      expect(await f.reader.detail(f.credential, target)).toMatchObject({ kind: "denied" });
    }
    expect(await f.reader.list(f.credential, { tenantId: TENANT_B })).toEqual({ kind: "denied", reason: "invalid_request" });
    expect(f.readSubscriptions).not.toHaveBeenCalled();
  });
  it("status read needs no tenant-owner approval; suspended tenant grants no writes", async () => {
    const f = setup(); expect(await f.reader.detail(f.credential, "binding-a")).toMatchObject({ kind: "ok", value: { allowedActions: ["account.read", "subscription.read"] } });
  });
  it("account.read without subscription.read cannot expose product facts", async () => {
    const f = setup(); f.state.principal.actions = ["account.read"];
    expect(await f.reader.detail(f.credential, "binding-a")).toMatchObject({ kind: "ok", value: {
      product: { state: "unavailable", reason: "action_not_permitted" }, allowedActions: ["account.read"] } });
  });
  it("does not query products without account.read even on empty pages", async () => {
    const f = setup(); f.state.principal.actions = ["subscription.read"];
    expect(await f.reader.detail(f.credential, "binding-a")).toEqual({ kind: "denied", reason: "action_denied" });
    f.state.assignments = [];
    expect(await f.reader.list(f.credential, {})).toEqual({ kind: "denied", reason: "action_denied" });
    expect(f.readSubscriptions).not.toHaveBeenCalled();
  });
  it.each([
    { limit: 0 }, { limit: 101 }, { cursor: "" }, { cursor: "x".repeat(4097) },
    { environment: "production" }, { isSuperAdmin: true }, { slug: "a" }, { limit: "25" },
  ])("rejects untrusted list query %j before accessing authority", async (query) => {
    const f = setup(); expect(await f.reader.list(f.credential, query)).toEqual({ kind: "denied", reason: "invalid_request" });
    expect(f.ports.identity.verify).not.toHaveBeenCalled(); expect(f.readSubscriptions).not.toHaveBeenCalled();
  });
  it("denies deleted tenants, never returns default Maria", async () => {
    const f = setup(); f.readSubscriptions.mockResolvedValueOnce(new Map([[TENANT_A, { kind: "not_found", tenantId: TENANT_A }]]));
    expect(await f.reader.detail(f.credential, "binding-a")).toEqual({ kind: "denied", reason: "tenant_not_found" });
  });
  it("core DAL failure/missing result cannot become successful billing fallback", async () => {
    const f = setup();
    f.readSubscriptions.mockResolvedValueOnce(new Map([[TENANT_A, { kind: "read_failure", reason: "source_read_failed" }]]));
    expect(await f.reader.detail(f.credential, "binding-a")).toEqual({ kind: "denied", reason: "product_unavailable" });
    f.readSubscriptions.mockResolvedValueOnce(new Map());
    expect(await f.reader.detail(f.credential, "binding-a")).toEqual({ kind: "denied", reason: "product_unavailable" });
  });
  it("DAL exceptions are typed/sanitized without account facts or raw error", async () => {
    const f = setup(); f.readSubscriptions.mockRejectedValueOnce(new Error("mongodb://token customer@example.test raw stack"));
    expect(await f.reader.detail(f.credential, "binding-a")).toEqual({ kind: "denied", reason: "product_unavailable" });
  });
  it("rejects mismatched tenant/clock and injected private/raw nested data", async () => {
    const f = setup(); const valid = await f.readSubscriptions([TENANT_A], NOW); const read = valid.get(TENANT_A)!;
    if (read.kind !== "ok") throw Error("fixture failure");
    for (const bad of [
      { ...read.value, tenantId: TENANT_B }, { ...read.value, asOf: FUTURE },
      { ...read.value, recipients: ["customer@example.test"] },
      { ...read.value, trial: { ...read.value.trial, token: "secret" } },
      { ...read.value, quality: { ...read.value.quality, evidence: "PII", error: "private" } },
    ]) {
      f.readSubscriptions.mockResolvedValueOnce(new Map([[TENANT_A, { kind: "ok", value: bad }]]));
      expect(await f.reader.detail(f.credential, "binding-a")).toEqual({ kind: "denied", reason: "product_unavailable" });
    }
  });
  it("allowlisted DTO omits audit actor, assignments, assertion, secrets and recipient evidence", async () => {
    const f = setup(); const result = await f.reader.detail(f.credential, "binding-a");
    expect(JSON.stringify(result)).not.toMatch(/verifiedBy|internal-operator|sales-a|assertion-a|serviceCaller|assignmentId|recipients|overrideNote|repair|findings|token|customer@/);
  });
  it.each(["assignment", "binding", "principal", "rebind"] as const)("denies %s changes during DAL read", async (change) => {
    const f = setup(); const original = f.readSubscriptions.getMockImplementation()!;
    f.readSubscriptions.mockImplementationOnce(async (ids, now) => {
      const reads = await original(ids, now);
      if (change === "assignment") f.state.assignments[0].status = "revoked";
      if (change === "binding") f.state.bindingScopeRevision++;
      if (change === "principal") f.state.principal.actions = ["account.read"];
      if (change === "rebind") f.state.bindings[0].tenantId = TENANT_B;
      return reads;
    });
    expect(await f.reader.detail(f.credential, "binding-a")).toMatchObject({ kind: "denied" });
  });
  it("expires actor at response time even when read started with valid access", async () => {
    const f = setup(); const original = f.readSubscriptions.getMockImplementation()!;
    f.readSubscriptions.mockImplementationOnce(async (ids, now) => { const reads = await original(ids, now); f.state.now = new Date(FUTURE); return reads; });
    expect(await f.reader.detail(f.credential, "binding-a")).toEqual({ kind: "denied", reason: "principal_unverified" });
  });
  it("authority outage during response revalidation closes access", async () => {
    const f = setup(); const original = f.readSubscriptions.getMockImplementation()!;
    f.readSubscriptions.mockImplementationOnce(async (ids, now) => { const reads = await original(ids, now); f.ports.assignments.read.mockRejectedValueOnce(new Error("DMD down")); return reads; });
    expect(await f.reader.detail(f.credential, "binding-a")).toEqual({ kind: "denied", reason: "authority_unavailable" });
  });
  it("paginates assigned records with signed continuation and no repeated tenants", async () => {
    const f = setup(); const first = await f.reader.list(f.credential, { limit: 1 });
    if (first.kind !== "ok") throw Error("fixture denied");
    expect(first.value.items.map((item) => item.tenantId)).toEqual([TENANT_A]); expect(first.value.nextCursor).toBeTruthy();
    const second = await f.reader.list(f.credential, { limit: 1, cursor: first.value.nextCursor });
    expect(second).toMatchObject({ kind: "ok", value: { items: [{ tenantId: TENANT_B }], nextCursor: null } });
    expect(f.readSubscriptions.mock.calls.map(([ids]) => ids)).toEqual([[TENANT_A], [TENANT_B]]);
  });
  it.each(["actor", "principal-revision", "assignment-revision", "binding-revision", "off-page-binding", "permissions", "limit", "account", "signature", "expired"] as const)("invalidates cursor after %s change", async (change) => {
    const f = setup(); const first = await f.reader.list(f.credential, { limit: 1 });
    if (first.kind !== "ok" || !first.value.nextCursor) throw Error("fixture denied");
    let token = first.value.nextCursor;
    const changes = {
      actor: () => { f.state.principal.subject = "sales-b"; f.state.principal.actingFor = "sales-b"; f.state.assignments.forEach((item) => { item.subject = "sales-b"; }); },
      "principal-revision": () => { f.state.principal.revision++; },
      "assignment-revision": () => { f.state.assignmentScopeRevision++; },
      "binding-revision": () => { f.state.bindingScopeRevision++; },
      "off-page-binding": () => { f.state.bindings[0].revision++; f.state.bindingScopeRevision++; },
      permissions: () => { f.state.principal.actions = ["account.read"]; },
      signature: () => { token = `A${token.slice(1)}`; },
      expired: () => { f.state.now = new Date(FUTURE); },
      limit: () => {}, account: () => {},
    };
    changes[change]();
    f.readSubscriptions.mockClear();
    const result = await f.reader.list(f.credential, { limit: change === "limit" ? 2 : 1,
      cursor: token, ...(change === "account" ? { dmdAccountId: "account-b" } : {}) });
    expect(result).toMatchObject({ kind: "denied" }); expect(f.readSubscriptions).not.toHaveBeenCalled();
  });
  it("rejects an authentic cursor whose bound environment differs", async () => {
    const f = setup(); const first = await f.reader.list(f.credential, { limit: 1 });
    if (first.kind !== "ok" || !first.value.nextCursor) throw Error("fixture denied");
    const payload = f.cursor.decode(first.value.nextCursor)!;
    const cursor = f.cursor.encode({ ...payload, environment: "production" });
    f.readSubscriptions.mockClear();
    expect(await f.reader.list(f.credential, { limit: 1, cursor })).toEqual({ kind: "denied", reason: "cursor_invalid" });
    expect(f.readSubscriptions).not.toHaveBeenCalled();
  });
  it("no external fetch/send is performed by the projection foundation", async () => {
    const f = setup(); const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(Error("network forbidden"));
    try { expect(await f.reader.detail(f.credential, "binding-a")).toMatchObject({ kind: "ok" }); expect(fetch).not.toHaveBeenCalled(); }
    finally { fetch.mockRestore(); }
  });
});
