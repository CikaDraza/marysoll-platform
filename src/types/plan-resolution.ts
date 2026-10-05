import type { PlanName } from "@/types/resource-quota";

export interface EffectivePlanSubscriptionInput {
  plan?: PlanName | null;
  status?: string | null;
  billingProvider?: string | null;
  currentPeriodEnd?: Date | string | null;
}
export interface EffectivePlanTenantInput {
  plan?: PlanName | null;
  paid?: boolean | null;
  planExpiresAt?: Date | string | null;
}
export interface EffectivePlanDecision {
  plan: PlanName;
  source: "subscription" | "tenant_legacy" | "maria_default";
  reason: "subscription_grant" | "tenant_legacy_grant" | "no_paid_plan_grant";
}
