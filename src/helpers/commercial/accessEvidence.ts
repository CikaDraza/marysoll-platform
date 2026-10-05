import type { CommercialAccess, CommercialAssignmentAccess, CommercialPrincipal, CommercialPolicyConfig, ProductAccountBinding } from "@/types/commercial";

export function principalIsCurrent(principal: CommercialPrincipal, config: CommercialPolicyConfig, now: Date): boolean {
  const time = now.getTime();
  return config.trustedIssuers.includes(principal.issuer)
    && principal.environment === config.environment && principal.actingFor === principal.subject
    && Date.parse(principal.issuedAt) <= time && Date.parse(principal.notBefore) <= time
    && Date.parse(principal.expiresAt) > time && Date.parse(principal.checkedAt) === time;
}

export function assignmentPageIsScoped(access: CommercialAssignmentAccess): boolean {
  const { assignments: page, principal, selection } = access;
  const time = Date.parse(access.asOf);
  if (page.subject !== principal.subject || page.environment !== principal.environment
    || page.checkedAt !== access.asOf || Date.parse(page.expiresAt) <= time) return false;
  if (selection.kind === "binding") {
    if (page.assignments.length !== 1 || page.nextAfter !== null) return false;
  } else if (page.assignments.length > selection.limit
    || (page.nextAfter !== null && (page.assignments.length === 0 || page.nextAfter === selection.after))) return false;
  const ids = new Set<string>();
  const bindingIds = new Set<string>();
  return page.assignments.every((item) => {
    const selected = selection.kind === "binding" ? item.bindingId === selection.bindingId
      : selection.dmdAccountId === null || item.dmdAccountId === selection.dmdAccountId;
    const valid = selected && item.subject === principal.subject && item.environment === principal.environment
      && item.status === "active" && Date.parse(item.expiresAt) > time
      && !ids.has(item.assignmentId) && !bindingIds.has(item.bindingId);
    ids.add(item.assignmentId); bindingIds.add(item.bindingId);
    return valid;
  });
}

function bindingIsCurrent(binding: ProductAccountBinding, time: number): boolean {
  return binding.status === "active" && binding.revokedAt === null
    && Date.parse(binding.createdAt) <= Date.parse(binding.updatedAt)
    && Date.parse(binding.updatedAt) <= time && Date.parse(binding.verifiedAt) <= time
    && Date.parse(binding.verifiedAt) >= Date.parse(binding.createdAt);
}

export function bindingPageIsScoped(access: CommercialAccess): boolean {
  const { bindings: page, assignments, principal } = access;
  if (page.environment !== principal.environment || page.checkedAt !== access.asOf
    || page.bindings.length !== assignments.assignments.length) return false;
  const ids = new Set<string>();
  const tenants = new Set<string>();
  return page.bindings.every((binding) => {
    const assignment = assignments.assignments.find((item) => item.bindingId === binding.bindingId);
    const valid = assignment !== undefined && binding.environment === principal.environment
      && binding.dmdAccountId === assignment.dmdAccountId && binding.revision === assignment.bindingRevision
      && bindingIsCurrent(binding, Date.parse(access.asOf))
      && !ids.has(binding.bindingId) && !tenants.has(binding.tenantId);
    ids.add(binding.bindingId); tenants.add(binding.tenantId);
    return valid;
  });
}

/** Ignore observation times/new assertion IDs, never semantic scope/permission revisions. */
export function accessIdentity(access: CommercialAccess): string {
  const { principal, assignments, bindings, selection } = access;
  return JSON.stringify({
    principal: principalIdentity(principal), selection,
    assignments: { scopeRevision: assignments.scopeRevision, expiresAt: assignments.expiresAt,
      items: [...assignments.assignments].sort((a, b) => a.assignmentId.localeCompare(b.assignmentId)), nextAfter: assignments.nextAfter },
    bindings: { scopeRevision: bindings.scopeRevision, items: [...bindings.bindings].sort((a, b) => a.bindingId.localeCompare(b.bindingId)) },
  });
}

export function principalIdentity(principal: CommercialPrincipal): string {
  return JSON.stringify({ issuer: principal.issuer, subject: principal.subject, serviceCaller: principal.serviceCaller,
    actingFor: principal.actingFor, environment: principal.environment, revision: principal.revision,
    actions: [...new Set(principal.actions)].sort() });
}

export function freezeEvidence(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  for (const child of Object.values(value)) freezeEvidence(child);
  Object.freeze(value);
}
