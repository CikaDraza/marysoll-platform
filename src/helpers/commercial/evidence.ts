import { z } from "zod";
import { planNameSchema } from "@/types/resource-quota";
import { planFeaturesSchema } from "@/types/plan-status";
import { tenantCapabilityConfigurationSchema, tenantVerticalsWriteSchema } from "@/types/tenant-capabilities";
import {
  commercialBillingProviderSchema, commercialSubscriptionStatusSchema, commercialTenantStatusSchema,
  type CommercialEvidence, type CommercialIssue, type CommercialResolverInput,
} from "@/types/commercial-subscription";

const dateSchema = z.union([
  z.date(), z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
]);

function read<T>(schema: z.ZodType<T>, value: unknown, field: CommercialIssue["field"], issues: CommercialIssue[], required = false): T | null {
  if (value === undefined || value === null) {
    if (required) issues.push({ code: "required_field_missing", field });
    return null;
  }
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  issues.push({ code: "invalid_field", field });
  return null;
}

/** Validate individually so a corrupt field cannot erase valid independent truth. */
export function readCommercialEvidence({ tenant, subscription }: Omit<CommercialResolverInput, "now">): CommercialEvidence {
  const issues: CommercialIssue[] = [];
  const tenantEvidence = {
    status: read(commercialTenantStatusSchema, tenant.status, "tenant.status", issues, true),
    plan: read(planNameSchema, tenant.plan, "tenant.plan", issues, true),
    paid: read(z.boolean(), tenant.paid, "tenant.paid", issues, true),
    planExpiresAt: read(dateSchema, tenant.planExpiresAt, "tenant.planExpiresAt", issues),
    isTrialActive: read(z.boolean(), tenant.isTrialActive, "tenant.isTrialActive", issues),
    trialEndsAt: read(dateSchema, tenant.trialEndsAt, "tenant.trialEndsAt", issues),
    verticals: read(tenantVerticalsWriteSchema, tenant.verticals, "tenant.verticals", issues),
    capabilityConfiguration: read(tenantCapabilityConfigurationSchema, tenant.capabilityConfiguration, "tenant.capabilityConfiguration", issues),
  };
  const subscriptionEvidence = subscription === null ? null : {
    plan: read(planNameSchema, subscription.plan, "subscription.plan", issues, true),
    status: read(commercialSubscriptionStatusSchema, subscription.status, "subscription.status", issues, true),
    billingProvider: read(commercialBillingProviderSchema, subscription.billingProvider, "subscription.billingProvider", issues),
    currentPeriodEnd: read(dateSchema, subscription.currentPeriodEnd, "subscription.currentPeriodEnd", issues, true),
    featureOverrides: read(planFeaturesSchema.partial().strict(), subscription.featureOverrides, "subscription.featureOverrides", issues),
    overrideExpiresAt: read(dateSchema, subscription.overrideExpiresAt, "subscription.overrideExpiresAt", issues, subscription.featureOverrides != null),
  };
  if (subscription && subscription.billingProvider == null) {
    issues.push({ code: "legacy_provider_missing", field: "subscription.billingProvider" });
  }
  // Capability primitives distinguish absent legacy configuration from explicit
  // null, which is invalid and must fail closed rather than become a default.
  for (const field of ["verticals", "capabilityConfiguration"] as const) {
    if (tenant[field] === null) issues.push({ code: "invalid_field", field: `tenant.${field}` });
  }
  return { tenant: tenantEvidence, subscription: subscriptionEvidence, issues };
}

export function assertCommercialNow(now: Date): void {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError("Commercial resolution requires an explicit valid now");
  }
}

export function deduplicateCommercialIssues(issues: readonly CommercialIssue[]): CommercialIssue[] {
  return [...new Map(issues.map((issue) => [`${issue.code}:${issue.field}`, issue])).values()];
}
