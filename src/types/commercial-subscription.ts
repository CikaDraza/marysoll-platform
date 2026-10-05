import { z } from "zod";
import { planNameSchema } from "@/types/resource-quota";
import { planFeaturesSchema } from "@/types/plan-status";
import { TENANT_CAPABILITIES, TENANT_VERTICALS } from "@/types/tenant-capabilities";
import type { PlanFeatures } from "@/lib/plans/planFeatures";
import type { TenantCapabilityConfiguration, TenantVertical } from "@/types/tenant-capabilities";

export const commercialTenantStatusSchema = z.enum(["active", "suspended", "pending", "cancelled"]);
export const commercialSubscriptionStatusSchema = z.enum(["trialing", "active", "past_due", "cancelled", "paused", "expired"]);
export const commercialBillingProviderSchema = z.enum(["internal", "paddle"]);
const qualitySchema = z.enum(["authoritative", "legacy", "partial", "unavailable"]);
const fieldSchema = z.enum([
  "tenant.status", "tenant.plan", "tenant.paid", "tenant.planExpiresAt",
  "tenant.isTrialActive", "tenant.trialEndsAt", "tenant.verticals", "tenant.capabilityConfiguration",
  "subscription.plan", "subscription.status", "subscription.billingProvider",
  "subscription.currentPeriodEnd", "subscription.featureOverrides", "subscription.overrideExpiresAt",
]);
const commercialIssueSchema = z.object({
  code: z.enum([
    "invalid_field", "required_field_missing", "legacy_provider_missing",
    "trial_dates_disagree", "tenant_trial_with_non_trialing_subscription",
    "subscription_still_trialing", "tenant_trial_flag_stale", "trial_activation_unconfirmed",
    "tenant_trial_disabled_with_trialing_subscription", "paddle_period_not_verified_trial",
  ]),
  field: fieldSchema,
}).strict();
export type CommercialIssue = z.infer<typeof commercialIssueSchema>;
export type CommercialQuality = z.infer<typeof qualitySchema>;

const commercialTrialStateSchema = z.object({
  status: z.enum(["active", "expired", "inactive", "not_started", "not_trialing", "unknown"]),
  endsAt: z.iso.datetime().nullable(),
  source: z.enum(["tenant_trial", "subscription_period", "subscription_status", "none"]),
  reason: z.enum([
    "tenant_trial_running", "tenant_trial_elapsed", "legacy_tenant_trial_running", "legacy_tenant_trial_elapsed",
    "tenant_trial_disabled", "tenant_trial_not_started", "tenant_trial_not_active",
    "internal_trial_activation_unconfirmed", "subscription_not_trialing",
    "paddle_trial_period_running", "paddle_trial_period_elapsed",
    "trial_end_missing", "trial_end_invalid", "trial_evidence_missing", "trial_evidence_invalid",
  ]),
  quality: qualitySchema,
  issues: z.array(commercialIssueSchema),
}).strict();
export type CommercialTrialState = z.infer<typeof commercialTrialStateSchema>;

const fieldSourceSchema = z.object({
  source: z.enum(["tenant", "subscription", "tenant_legacy", "maria_default", "tenant_trial", "subscription_period", "subscription_status", "shared_plan_features", "shared_capabilities", "none", "unavailable"]),
  quality: qualitySchema,
  reason: z.enum([
    "recorded_value", "source_missing", "source_invalid", "legacy_internal_default",
    "subscription_grant", "tenant_legacy_grant", "no_paid_plan_grant",
    "shared_plan_features", "active_feature_overrides", "shared_capabilities",
    "payment_evidence_unavailable", "subscription_price_snapshot_missing",
    ...commercialTrialStateSchema.shape.reason.options,
  ]),
}).strict();
export type CommercialFieldSource = z.infer<typeof fieldSourceSchema>;

const capabilitySchema = z.object({
  capability: z.enum(TENANT_CAPABILITIES),
  enabled: z.boolean(), platformAvailable: z.boolean(), planEntitled: z.boolean(), tenantEnabled: z.boolean(),
}).strict();
const unavailablePaymentSchema = z.object({
  value: z.null(), source: z.literal("unavailable"), reason: z.literal("payment_evidence_unavailable"),
}).strict();

export const commercialSubscriptionStateSchema = z.object({
  schemaVersion: z.literal(1), asOf: z.iso.datetime(), tenantId: z.string().regex(/^[a-f\d]{24}$/i),
  tenantStatus: commercialTenantStatusSchema.nullable(),
  effectivePlan: planNameSchema,
  effectivePlanSource: z.enum(["subscription", "tenant_legacy", "maria_default"]),
  subscriptionStatus: commercialSubscriptionStatusSchema.nullable(),
  billingProvider: commercialBillingProviderSchema.nullable(),
  currentPeriodEnd: z.iso.datetime().nullable(),
  trial: commercialTrialStateSchema,
  paidThrough: unavailablePaymentSchema,
  lastSuccessfulPayment: unavailablePaymentSchema,
  price: z.object({
    amount: z.null(), currency: z.null(), interval: z.null(),
    source: z.literal("unavailable"), reason: z.literal("subscription_price_snapshot_missing"),
  }).strict(),
  features: planFeaturesSchema.strict(),
  capabilities: z.object({
    verticals: z.array(z.enum(TENANT_VERTICALS)),
    capabilities: z.record(z.enum(TENANT_CAPABILITIES), capabilitySchema),
  }).strict(),
  fieldSources: z.object({
    tenantStatus: fieldSourceSchema, effectivePlan: fieldSourceSchema,
    subscriptionStatus: fieldSourceSchema, billingProvider: fieldSourceSchema,
    trial: fieldSourceSchema, currentPeriodEnd: fieldSourceSchema,
    paidThrough: fieldSourceSchema, price: fieldSourceSchema, lastSuccessfulPayment: fieldSourceSchema,
    features: fieldSourceSchema, capabilities: fieldSourceSchema,
  }).strict(),
  quality: z.object({ state: qualitySchema, issues: z.array(commercialIssueSchema) }).strict(),
}).strict();
export type CommercialSubscriptionState = z.infer<typeof commercialSubscriptionStateSchema>;

// Persistence evidence is deliberately unknown: legacy/invalid/missing fields must
// remain distinguishable. No Mongoose documents or identifying customer fields.
export interface CommercialTenantInput {
  readonly status?: unknown; readonly plan?: unknown; readonly paid?: unknown;
  readonly planExpiresAt?: unknown; readonly isTrialActive?: unknown; readonly trialEndsAt?: unknown;
  readonly verticals?: unknown; readonly capabilityConfiguration?: unknown;
}
export interface CommercialSubscriptionInput {
  readonly plan?: unknown; readonly status?: unknown; readonly billingProvider?: unknown;
  readonly currentPeriodEnd?: unknown; readonly featureOverrides?: unknown; readonly overrideExpiresAt?: unknown;
}
export interface CommercialResolverInput {
  readonly tenant: CommercialTenantInput;
  readonly subscription: CommercialSubscriptionInput | null;
  readonly now: Date;
}
export type CommercialReadResult =
  | { readonly kind: "ok"; readonly value: CommercialSubscriptionState }
  | { readonly kind: "not_found"; readonly tenantId: string }
  | { readonly kind: "invalid_input"; readonly reason: "invalid_tenant_id" | "invalid_now" }
  | { readonly kind: "read_failure"; readonly reason: "source_read_failed" | "projection_failed" };

/** Only the DAL uses database identity wrappers; never returned in the read model. */
export interface CommercialTenantRecord extends CommercialTenantInput {
  readonly _id: { toString(): string };
}
export interface CommercialSubscriptionRecord extends CommercialSubscriptionInput {
  readonly tenantId: { toString(): string };
}

export interface CommercialEvidence {
  tenant: {
    status: z.infer<typeof commercialTenantStatusSchema> | null;
    plan: z.infer<typeof planNameSchema> | null;
    paid: boolean | null; planExpiresAt: Date | null;
    isTrialActive: boolean | null; trialEndsAt: Date | null;
    verticals: TenantVertical[] | null;
    capabilityConfiguration: TenantCapabilityConfiguration | null;
  };
  subscription: {
    plan: z.infer<typeof planNameSchema> | null;
    status: z.infer<typeof commercialSubscriptionStatusSchema> | null;
    billingProvider: z.infer<typeof commercialBillingProviderSchema> | null;
    currentPeriodEnd: Date | null;
    featureOverrides: Partial<PlanFeatures> | null; overrideExpiresAt: Date | null;
  } | null;
  issues: CommercialIssue[];
}
export interface CommercialTrialContext extends CommercialEvidence {
  now: Date;
}
