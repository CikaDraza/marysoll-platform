import { describe, it, expect } from "vitest";
import { createCommercialPolicy } from "./policy";
import { config, createCommercialFixture, NOW, PAST, FUTURE, TENANT_A, TENANT_B } from "./commercial.fixtures";
import { commercialActionSchema } from "@/types/commercial";

const selection = { kind: "binding" as const, bindingId: "binding-a" };
function setup() { const fixture = createCommercialFixture(); return { ...fixture, policy: createCommercialPolicy(fixture.ports, config) }; }

describe("Commercial verified-principal policy", () => {
  it("rejects spoofed schema-shaped principal, admin token, secret and missing identity", async () => {
    const f = setup();
    for (const credential of [null, "internal-secret", { isSuperAdmin: true }, f.state.principal, { subject: "sales-a" }]) {
      expect(await f.policy.load(credential, selection, NOW)).toEqual({ kind: "denied", reason: "principal_unverified" });
    }
    expect(f.ports.assignments.read).not.toHaveBeenCalled();
  });
  it.each([
    ["issuer", "untrusted"], ["audience", "tenant-admin"], ["subject", "other-sales"],
    ["environment", "production"], ["environment", "unknown"], ["status", "revoked"],
    ["expiresAt", NOW.toISOString()], ["expiresAt", PAST], ["notBefore", FUTURE], ["issuedAt", FUTURE],
    ["checkedAt", PAST], ["assertionId", ""], ["revision", 0], ["actions", ["*"]],
  ])("rejects invalid/unverified principal %s=%s", async (field, value) => {
    const f = setup();
    f.ports.identity.verify.mockResolvedValueOnce({ ...f.state.principal, [field]: value });
    expect(await f.policy.load(f.credential, selection, NOW)).toMatchObject({ kind: "denied", reason: "principal_unverified" });
    expect(f.ports.assignments.read).not.toHaveBeenCalled();
  });
  it("treats authority outage as denial without leaking errors", async () => {
    const f = setup(); f.ports.identity.verify.mockRejectedValue(new Error("token=secret customer@example.test"));
    expect(await f.policy.load(f.credential, selection, NOW)).toEqual({ kind: "denied", reason: "authority_unavailable" });
  });
  it("rejects stale assignment and binding snapshots", async () => {
    const f = setup(); const assignments = f.ports.assignments.read.getMockImplementation()!;
    f.ports.assignments.read.mockImplementationOnce(async (...args) => ({ ...await assignments(...args) as object, checkedAt: PAST }));
    expect(await f.policy.load(f.credential, selection, NOW)).toEqual({ kind: "denied", reason: "assignment_denied" });
    const bindings = f.ports.bindings.read.getMockImplementation()!;
    f.ports.bindings.read.mockImplementationOnce(async (...args) => ({ ...await bindings(...args) as object, checkedAt: PAST }));
    expect(await f.policy.load(f.credential, selection, NOW)).toEqual({ kind: "denied", reason: "binding_denied" });
  });
  it.each(["revoked", "suspended"] as const)("rejects %s assignments before reading bindings", async (status) => {
    const f = setup(); f.state.assignments[0].status = status;
    expect(await f.policy.load(f.credential, selection, NOW)).toEqual({ kind: "denied", reason: "assignment_denied" });
    expect(f.ports.bindings.read).not.toHaveBeenCalled();
  });
  it("rejects expired assignment at the exact boundary", async () => {
    const f = setup(); f.state.assignments[0].expiresAt = NOW.toISOString();
    expect(await f.policy.load(f.credential, selection, NOW)).toEqual({ kind: "denied", reason: "assignment_denied" });
  });
  it.each([
    ["subject", "sales-b"], ["environment", "production"], ["bindingId", "binding-b"],
    ["bindingRevision", 2], ["dmdAccountId", "account-b"],
  ])("rejects mismatched assignment %s=%s", async (field, value) => {
    const f = setup(); f.ports.assignments.read.mockResolvedValueOnce({ subject: "sales-a", environment: "staging",
      scopeRevision: 1, checkedAt: NOW.toISOString(), expiresAt: FUTURE, nextAfter: null,
      assignments: [{ ...f.state.assignments[0], [field]: value }] });
    expect(await f.policy.load(f.credential, selection, NOW)).toMatchObject({ kind: "denied" });
  });
  it("rejects broader assignment pages than the requested account/page scope", async () => {
    const f = setup(); f.ports.assignments.read.mockResolvedValueOnce({ subject: "sales-a", environment: "staging",
      scopeRevision: 1, checkedAt: NOW.toISOString(), expiresAt: FUTURE, nextAfter: null, assignments: f.state.assignments });
    expect(await f.policy.load(f.credential, { kind: "list", limit: 1, after: null, dmdAccountId: "account-a" }, NOW)).toEqual({ kind: "denied", reason: "assignment_denied" });
    expect(f.ports.bindings.read).not.toHaveBeenCalled();
  });
  it.each([
    ["dmdAccountId", "another-account"], ["bindingId", "another-binding"], ["tenantId", "mutable-slug"],
    ["environment", "production"], ["productKey", "other-product"], ["revision", 2],
    ["status", "pending"], ["status", "suspended"], ["status", "revoked"],
    ["revokedAt", PAST], ["verifiedAt", FUTURE], ["updatedAt", FUTURE],
  ])("rejects binding mismatch %s=%s", async (field, value) => {
    const f = setup(); f.ports.bindings.read.mockResolvedValueOnce({ environment: "staging", scopeRevision: 1,
      checkedAt: NOW.toISOString(), bindings: [{ ...f.state.bindings[0], [field]: value }] });
    expect(await f.policy.load(f.credential, selection, NOW)).toMatchObject({ kind: "denied" });
  });
  it("does not infer bindings from mutable labels/email/name", async () => {
    const f = setup(); f.state.bindings = [];
    expect(await f.policy.load(f.credential, selection, NOW)).toEqual({ kind: "denied", reason: "binding_denied" });
    expect(await f.policy.load(f.credential, { kind: "binding", bindingId: "customer@example.test" }, NOW)).toMatchObject({ kind: "denied" });
  });
  it("rejects duplicate active tenant mappings and duplicate assignments", async () => {
    const f = setup(); f.state.bindings[1].tenantId = TENANT_A;
    expect(await f.policy.load(f.credential, { kind: "list", limit: 25, after: null, dmdAccountId: null }, NOW)).toMatchObject({ kind: "denied", reason: "binding_denied" });
    f.state.bindings[1].tenantId = TENANT_B; f.state.assignments[1].assignmentId = f.state.assignments[0].assignmentId;
    expect(await f.policy.load(f.credential, { kind: "list", limit: 25, after: null, dmdAccountId: null }, NOW)).toMatchObject({ kind: "denied", reason: "assignment_denied" });
  });
  it("issues immutable scopes and denies unissued/foreign access evidence", async () => {
    const f = setup(); const result = await f.policy.load(f.credential, selection, NOW);
    expect(result.kind).toBe("ok"); if (result.kind !== "ok") return;
    expect(Object.isFrozen(result.access.principal.actions)).toBe(true);
    expect(f.policy.authorize({ ...result.access }, "binding-a", "account.read")).toMatchObject({ kind: "denied" });
    expect(createCommercialPolicy(f.ports, config).authorize(result.access, "binding-a", "account.read")).toMatchObject({ kind: "denied" });
    expect(f.policy.authorize(result.access, "binding-a", "account.read")).toMatchObject({ kind: "ok", scope: { tenantId: TENANT_A } });
    expect(f.policy.authorize(result.access, "binding-b", "account.read")).toMatchObject({ kind: "denied" });
  });
  it("requires action permission; roles/capabilities do not bypass it", async () => {
    const f = setup(); f.state.principal.actions = ["account.read"];
    const result = await f.policy.load(f.credential, selection, NOW); if (result.kind !== "ok") throw Error("fixture denied");
    expect(f.policy.authorize(result.access, "binding-a", "subscription.read")).toEqual({ kind: "denied", reason: "action_denied" });
    for (const action of [...commercialActionSchema.options.filter((item) => !["account.read", "subscription.read"].includes(item)),
      "campaign.send", "campaign.schedule", "campaign.publish", "campaign.unpublish", "recipient.read", "audience.export", "billing.update", "account.binding.manage", "*"]) {
      expect(f.policy.authorize(result.access, "binding-a", action)).toEqual({ kind: "denied", reason: "unsupported_action" });
    }
  });
  it("rejects foreign tenant and binding resource ownership", async () => {
    const f = setup(); const result = await f.policy.load(f.credential, selection, NOW); if (result.kind !== "ok") throw Error("fixture denied");
    for (const resource of [{ tenantId: TENANT_B, bindingId: "binding-a" }, { tenantId: TENANT_A, bindingId: "binding-b" }]) {
      expect(f.policy.authorize(result.access, "binding-a", "account.read", resource)).toEqual({ kind: "denied", reason: "resource_denied" });
    }
  });
  it("rejects changed assignment/binding during revalidation", async () => {
    const f = setup(); const result = await f.policy.load(f.credential, selection, NOW); if (result.kind !== "ok") throw Error("fixture denied");
    f.state.assignmentScopeRevision++;
    expect(await f.policy.revalidate(f.credential, result.access, NOW)).toEqual({ kind: "denied", reason: "scope_changed" });
  });
  it("validates clock and selection before consulting authority", async () => {
    const f = setup();
    expect(await f.policy.load(f.credential, selection, new Date(NaN))).toEqual({ kind: "denied", reason: "invalid_request" });
    expect(await f.policy.load(f.credential, { ...selection, tenantId: TENANT_B } as never, NOW)).toEqual({ kind: "denied", reason: "invalid_request" });
    expect(f.ports.identity.verify).not.toHaveBeenCalled();
  });
});
