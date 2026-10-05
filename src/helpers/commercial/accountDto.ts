import { commercialAccountDtoSchema } from "@/types/commercial";
import type { CommercialAccountDto, CommercialTenantScope } from "@/types/commercial";
import { commercialSubscriptionStateSchema } from "@/types/commercial-subscription";
import type { CommercialReadResult } from "@/types/commercial-subscription";

export function mapCommercialAccount(scope: CommercialTenantScope, read: CommercialReadResult, asOf: string): CommercialAccountDto {
  const unavailable = { state: "unavailable" as const, reason: "not_implemented" as const, asOf };
  const product = scope.allowedActions.includes("subscription.read")
    ? mapProduct(read, scope.tenantId, asOf)
    : { state: "unavailable" as const, reason: "action_not_permitted" as const, asOf };
  return commercialAccountDtoSchema.parse({
    schemaVersion: 1, productKey: "marysoll", dmdAccountId: scope.dmdAccountId,
    bindingId: scope.bindingId, bindingRevision: scope.bindingRevision, tenantId: scope.tenantId,
    environment: scope.environment, asOf, allowedActions: [...scope.allowedActions], product,
    modules: { usage: unavailable, diagnostics: unavailable, marketing: unavailable,
      audience: unavailable, incidents: unavailable, relationship: unavailable },
  });
}

function mapProduct(read: CommercialReadResult, tenantId: string, asOf: string) {
  if (read.kind === "ok") {
    const parsed = commercialSubscriptionStateSchema.safeParse(read.value);
    if (parsed.success && parsed.data.tenantId === tenantId && parsed.data.asOf === asOf) return { state: "ready" as const, value: parsed.data };
  }
  const reason = read.kind === "read_failure" ? read.reason : "projection_failed";
  return { state: "unavailable" as const, reason, asOf };
}
