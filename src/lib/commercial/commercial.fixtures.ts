// Test adapter only: no runtime importer, network, token decoder or auth fallback.
import { vi } from "vitest";
import { commercialPrincipalSchema, commercialAssignmentSchema, productAccountBindingSchema } from "@/types/commercial";
import type { CommercialAccountReadDependencies, CommercialPolicyPorts } from "@/types/commercial";
import { resolveCommercialSubscriptionState } from "@/helpers/commercial/resolveCommercialSubscriptionState";

export const NOW = new Date("2026-10-05T12:00:00.000Z");
export const FUTURE = "2026-10-06T12:00:00.000Z";
export const PAST = "2026-10-04T12:00:00.000Z";
export const TENANT_A = "507f1f77bcf86cd799439011";
export const TENANT_B = "507f1f77bcf86cd799439012";
export const config = { environment: "staging" as const, trustedIssuers: ["dmd-fixture"] };

export function createCommercialFixture() {
  const credential = Object.freeze({ fixtureIdentity: Symbol("verified fixture credential") });
  const principal = commercialPrincipalSchema.parse({ schemaVersion: 1, issuer: "dmd-fixture", audience: "marysoll-commercial",
    subject: "sales-a", serviceCaller: "commercial-adapter", actingFor: "sales-a", environment: "staging",
    status: "active", revision: 1, assertionId: "assertion-a", issuedAt: PAST, notBefore: PAST,
    expiresAt: FUTURE, checkedAt: NOW.toISOString(), actions: ["account.read", "subscription.read"] });
  const assignments = ["a", "b"].map((suffix) => commercialAssignmentSchema.parse({
    assignmentId: `assignment-${suffix}`, revision: 1, subject: "sales-a", dmdAccountId: `account-${suffix}`,
    bindingId: `binding-${suffix}`, bindingRevision: 1, environment: "staging", status: "active", expiresAt: FUTURE,
  }));
  const bindings = [TENANT_A, TENANT_B].map((tenantId, index) => productAccountBindingSchema.parse({
    bindingId: assignments[index].bindingId, dmdAccountId: assignments[index].dmdAccountId,
    productKey: "marysoll", tenantId, environment: "staging", status: "active", revision: 1,
    createdAt: PAST, updatedAt: PAST, verifiedAt: PAST, verifiedBy: "internal-operator",
    revokedAt: null, reasonCode: null,
  }));
  const state = { principal, assignments, bindings, assignmentScopeRevision: 1, bindingScopeRevision: 1, now: new Date(NOW) };
  const ports = {
    identity: { verify: vi.fn<CommercialPolicyPorts["identity"]["verify"]>(async (supplied, { now }) =>
      supplied === credential ? { ...state.principal, checkedAt: now.toISOString() } : null) },
    assignments: { read: vi.fn<CommercialPolicyPorts["assignments"]["read"]>(async (actor, selection, now) => {
      const matches = state.assignments.filter((item) => item.subject === actor.subject).filter((item) => selection.kind === "binding"
        ? item.bindingId === selection.bindingId : selection.dmdAccountId === null || item.dmdAccountId === selection.dmdAccountId);
      let start = 0;
      if (selection.kind === "list" && selection.after !== null) {
        const index = matches.findIndex((item) => item.assignmentId === selection.after);
        if (index < 0) throw new Error("unknown fixture continuation");
        start = index + 1;
      }
      const limit = selection.kind === "binding" ? 1 : selection.limit;
      const items = matches.slice(start, start + limit);
      return { subject: actor.subject, environment: "staging", scopeRevision: state.assignmentScopeRevision,
        checkedAt: now.toISOString(), expiresAt: FUTURE, assignments: items,
        nextAfter: start + limit < matches.length ? items.at(-1)!.assignmentId : null };
    }) },
    bindings: { read: vi.fn<CommercialPolicyPorts["bindings"]["read"]>(async (ids, environment, now) => ({
      environment, scopeRevision: state.bindingScopeRevision, checkedAt: now.toISOString(),
      bindings: state.bindings.filter((item) => ids.includes(item.bindingId)),
    })) },
  } satisfies CommercialPolicyPorts;
  const readSubscriptions = vi.fn<NonNullable<CommercialAccountReadDependencies["readSubscriptions"]>>(async (ids, now) => new Map(ids.map((tenantId) => [tenantId, {
    kind: "ok" as const,
    value: resolveCommercialSubscriptionState({ tenantId, now, tenant: { status: "suspended", plan: "kiki", paid: true, isTrialActive: false, trialEndsAt: null },
      subscription: { plan: "claudia", status: "active", billingProvider: "paddle", currentPeriodEnd: "bad period" } }),
  }])));
  return { credential, state, ports, readSubscriptions, now: () => new Date(state.now) };
}
