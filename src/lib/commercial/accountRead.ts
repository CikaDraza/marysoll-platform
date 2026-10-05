import "server-only";
import { commercialDetailResultSchema, commercialListInputSchema, commercialListDtoSchema, commercialListResultSchema, commercialSelectionSchema } from "@/types/commercial";
import type { CommercialAccess, CommercialAccountReadDependencies, CommercialCursorPayload, CommercialDetailResult, CommercialFailure, CommercialListInput, CommercialListResult, CommercialScopesResult, CommercialSelection, CommercialTenantScope } from "@/types/commercial";
import { commercialSubscriptionStateSchema } from "@/types/commercial-subscription";
import type { CommercialReadResult } from "@/types/commercial-subscription";
import { readCommercialSubscriptions } from "@/lib/commercial/subscriptionRead";
import { commercialPrincipalKey } from "@/lib/commercial/cursor";
import { mapCommercialAccount } from "@/helpers/commercial/accountDto";

function cursorMatches(cursor: CommercialCursorPayload, access: CommercialAccess): boolean {
  if (access.selection.kind !== "list") return false;
  return cursor.principalKey === commercialPrincipalKey(access) && cursor.environment === access.principal.environment
    && cursor.assignmentScopeRevision === access.assignments.scopeRevision && cursor.bindingScopeRevision === access.bindings.scopeRevision
    && cursor.dmdAccountId === access.selection.dmdAccountId && cursor.limit === access.selection.limit
    && Date.parse(cursor.expiresAt) > Date.parse(access.asOf);
}

function readFailure(read: CommercialReadResult | undefined, scope: CommercialTenantScope, asOf: string): CommercialFailure | null {
  if (read?.kind === "not_found") return { kind: "denied", reason: "tenant_not_found" };
  if (read?.kind !== "ok") return { kind: "denied", reason: "product_unavailable" };
  const parsed = commercialSubscriptionStateSchema.safeParse(read.value);
  if (!parsed.success || parsed.data.tenantId !== scope.tenantId || parsed.data.asOf !== asOf) return { kind: "denied", reason: "product_unavailable" };
  return null;
}

/** Internal service only. All IDs sent to SALES-1 come from this policy's verified scopes. */
export function createCommercialAccountReader(dependencies: CommercialAccountReadDependencies) {
  const { policy, cursor } = dependencies;
  const readSubscriptions = dependencies.readSubscriptions ?? readCommercialSubscriptions;

  function assignedScopes(access: CommercialAccess): CommercialScopesResult {
    const scopes: CommercialTenantScope[] = [];
    for (const assignment of access.assignments.assignments) {
      const decision = policy.authorize(access, assignment.bindingId, "account.read");
      if (decision.kind !== "ok") return decision;
      scopes.push(decision.scope);
    }
    // Empty pages still require account.read and a fresh authority round-trip.
    if (!access.principal.actions.includes("account.read")) return { kind: "denied", reason: "action_denied" } as const;
    return { kind: "ok", scopes };
  }

  async function readAssigned(credential: unknown, selection: CommercialSelection, continuation: CommercialCursorPayload | null) {
    const now = new Date(dependencies.now().getTime());
    const loaded = await policy.load(credential, selection, now);
    if (loaded.kind !== "ok") return loaded;
    const { access } = loaded;
    if (continuation && !cursorMatches(continuation, access)) return { kind: "denied", reason: "cursor_invalid" } as const;
    const scoped = assignedScopes(access);
    if (scoped.kind !== "ok") return scoped;
    const { scopes } = scoped;
    const reads = scopes.length ? await readSubscriptions(scopes.map((scope) => scope.tenantId), new Date(now)) : new Map<string, CommercialReadResult>();
    for (const scope of scopes) {
      const failure = readFailure(reads.get(scope.tenantId), scope, access.asOf);
      if (failure) return failure;
    }
    const failure = await policy.revalidate(credential, access, new Date(dependencies.now().getTime()));
    if (failure) return failure;
    const items = scopes.map((scope) => mapCommercialAccount(scope, reads.get(scope.tenantId)!, access.asOf));
    return { kind: "ok", access, items } as const;
  }

  function nextCursor(access: CommercialAccess): string | null {
    if (access.selection.kind !== "list" || access.assignments.nextAfter === null) return null;
    const expiry = Math.min(Date.parse(access.principal.expiresAt), Date.parse(access.assignments.expiresAt),
      ...access.assignments.assignments.map((assignment) => Date.parse(assignment.expiresAt)));
    return cursor.encode({ schemaVersion: 1, principalKey: commercialPrincipalKey(access),
      environment: access.principal.environment, assignmentScopeRevision: access.assignments.scopeRevision,
      bindingScopeRevision: access.bindings.scopeRevision, dmdAccountId: access.selection.dmdAccountId,
      limit: access.selection.limit, after: access.assignments.nextAfter, expiresAt: new Date(expiry).toISOString() });
  }

  async function readList(credential: unknown, input: CommercialListInput): Promise<CommercialListResult> {
    const continuation = input.cursor ? cursor.decode(input.cursor) : null;
    if (input.cursor && continuation === null) return { kind: "denied", reason: "cursor_invalid" };
    const selection: CommercialSelection = { kind: "list", limit: input.limit,
      after: continuation?.after ?? null, dmdAccountId: input.dmdAccountId ?? null };
    const result = await readAssigned(credential, selection, continuation);
    if (result.kind !== "ok") return result;
    return { kind: "ok", value: commercialListDtoSchema.parse({ schemaVersion: 1, asOf: result.access.asOf,
      items: result.items, nextCursor: nextCursor(result.access) }) };
  }

  async function list(credential: unknown, input: unknown): Promise<CommercialListResult> {
    const parsed = commercialListInputSchema.safeParse(input);
    if (!parsed.success) return { kind: "denied", reason: "invalid_request" };
    try {
      return commercialListResultSchema.parse(await readList(credential, parsed.data));
    } catch { return { kind: "denied", reason: "product_unavailable" }; }
  }

  async function detail(credential: unknown, bindingId: unknown): Promise<CommercialDetailResult> {
    const parsed = commercialSelectionSchema.safeParse({ kind: "binding", bindingId });
    if (!parsed.success) return { kind: "denied", reason: "invalid_request" };
    try {
      const result = await readAssigned(credential, parsed.data, null);
      if (result.kind !== "ok") return commercialDetailResultSchema.parse(result);
      return commercialDetailResultSchema.parse({ kind: "ok", value: result.items[0] });
    } catch { return { kind: "denied", reason: "product_unavailable" }; }
  }
  return { list, detail };
}
