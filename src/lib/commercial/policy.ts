import "server-only";
import { commercialPrincipalSchema, commercialSelectionSchema, commercialAssignmentPageSchema, commercialBindingPageSchema, commercialEnvironmentSchema } from "@/types/commercial";
import type { CommercialAccess, CommercialAccessResult, CommercialAssignmentAccessResult, CommercialPolicy, CommercialPolicyConfig, CommercialPolicyPorts, CommercialSelection, CommercialScopeResult, CommercialResourceContext } from "@/types/commercial";
import { principalIsCurrent, assignmentPageIsScoped, bindingPageIsScoped, accessIdentity, freezeEvidence } from "@/helpers/commercial/accessEvidence";

/** Only SALES-1-backed reads are operational. Capability availability is not a permission. */
const SUPPORTED_ACTIONS = ["account.read", "subscription.read"] as const;
function supportedAction(action: string): action is typeof SUPPORTED_ACTIONS[number] {
  return SUPPORTED_ACTIONS.some((item) => item === action);
}
function resourceMatches(resource: CommercialResourceContext | undefined, tenantId: string, bindingId: string): boolean {
  return resource === undefined || (resource.tenantId === tenantId && resource.bindingId === bindingId);
}

export function createCommercialPolicy(ports: CommercialPolicyPorts, configuration: CommercialPolicyConfig): CommercialPolicy {
  const config = { environment: commercialEnvironmentSchema.parse(configuration.environment), trustedIssuers: [...configuration.trustedIssuers] };
  // A schema-shaped object supplied by a caller is never accepted as verified access.
  const issued = new WeakSet<CommercialAccess>();

  async function assignmentEvidence(credential: unknown, selection: CommercialSelection, now: Date): Promise<CommercialAssignmentAccessResult> {
    const verified = commercialPrincipalSchema.safeParse(await ports.identity.verify(credential, { environment: config.environment, now: new Date(now) }));
    if (!verified.success || !principalIsCurrent(verified.data, config, now)) return { kind: "denied", reason: "principal_unverified" };
    freezeEvidence(verified.data);
    freezeEvidence(selection);
    const assignments = commercialAssignmentPageSchema.safeParse(await ports.assignments.read(verified.data, selection, new Date(now)));
    if (!assignments.success) return { kind: "denied", reason: "invalid_authority_evidence" };
    // Validate assignment scope before consulting binding storage.
    const access = { principal: verified.data, assignments: assignments.data, selection, asOf: now.toISOString() };
    if (!assignmentPageIsScoped(access)) return { kind: "denied", reason: "assignment_denied" };
    freezeEvidence(assignments.data);
    return { kind: "ok", access };
  }

  async function load(credential: unknown, input: CommercialSelection, clock: Date): Promise<CommercialAccessResult> {
    const selection = commercialSelectionSchema.safeParse(input);
    if (!selection.success || !(clock instanceof Date) || !Number.isFinite(clock.getTime())) return { kind: "denied", reason: "invalid_request" };
    const now = new Date(clock.getTime());
    try {
      const evidence = await assignmentEvidence(credential, selection.data, now);
      if (evidence.kind !== "ok") return evidence;
      const { access } = evidence;
      const bindings = commercialBindingPageSchema.safeParse(await ports.bindings.read(access.assignments.assignments.map((item) => item.bindingId), config.environment, new Date(now)));
      if (!bindings.success) return { kind: "denied", reason: "invalid_authority_evidence" };
      const complete = { ...access, bindings: bindings.data };
      if (!bindingPageIsScoped(complete)) return { kind: "denied", reason: "binding_denied" };
      freezeEvidence(complete);
      issued.add(complete);
      return { kind: "ok", access: complete };
    } catch { return { kind: "denied", reason: "authority_unavailable" }; }
  }

  function authorize(access: CommercialAccess, bindingId: string, action: string, resource?: CommercialResourceContext): CommercialScopeResult {
    if (!issued.has(access)) return { kind: "denied", reason: "principal_unverified" };
    if (!supportedAction(action)) return { kind: "denied", reason: "unsupported_action" };
    if (!access.principal.actions.includes(action)) return { kind: "denied", reason: "action_denied" };
    const assignment = access.assignments.assignments.find((item) => item.bindingId === bindingId);
    const binding = access.bindings.bindings.find((item) => item.bindingId === bindingId);
    if (!assignment || !binding) return { kind: "denied", reason: "assignment_denied" };
    if (!resourceMatches(resource, binding.tenantId, binding.bindingId)) return { kind: "denied", reason: "resource_denied" };
    const scope = { subject: access.principal.subject, dmdAccountId: binding.dmdAccountId,
      bindingId, bindingRevision: binding.revision, tenantId: binding.tenantId, environment: binding.environment,
      assignmentId: assignment.assignmentId, assignmentRevision: assignment.revision,
      allowedActions: SUPPORTED_ACTIONS.filter((item) => access.principal.actions.includes(item)) };
    freezeEvidence(scope);
    return { kind: "ok", scope };
  }

  async function revalidate(credential: unknown, access: CommercialAccess, now: Date) {
    if (!issued.has(access)) return { kind: "denied", reason: "principal_unverified" } as const;
    const current = await load(credential, access.selection, now);
    if (current.kind !== "ok") return current;
    if (accessIdentity(access) !== accessIdentity(current.access)) return { kind: "denied", reason: "scope_changed" } as const;
    return null;
  }
  return { load, authorize, revalidate };
}
