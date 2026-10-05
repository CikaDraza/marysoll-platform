import { getPlanFeatures, resolveActiveFeatureOverrides, resolveEffectivePlanDecision, type PlanFeatures } from "@/lib/plans/planFeatures";
import { resolveCapability, resolveEffectiveVerticals } from "@/lib/platform/capabilities";
import { TENANT_CAPABILITIES } from "@/types/tenant-capabilities";
import {
  commercialSubscriptionStateSchema,
  type CommercialEvidence, type CommercialFieldSource, type CommercialIssue, type CommercialQuality,
  type CommercialResolverInput, type CommercialSubscriptionState, type CommercialTenantInput, type CommercialTrialState,
} from "@/types/commercial-subscription";
import { assertCommercialNow, deduplicateCommercialIssues, readCommercialEvidence } from "./evidence";
import { resolveCommercialTrialState } from "./resolveCommercialTrialState";

const SUBSCRIPTION_PLAN_FIELDS = new Set<CommercialIssue["field"]>([
  "subscription.plan", "subscription.status", "subscription.billingProvider", "subscription.currentPeriodEnd",
]);
const TENANT_PLAN_FIELDS = new Set<CommercialIssue["field"]>(["tenant.plan", "tenant.paid", "tenant.planExpiresAt"]);
const CAPABILITY_FIELDS = new Set<CommercialIssue["field"]>(["tenant.verticals", "tenant.capabilityConfiguration"]);
const OVERRIDE_FIELDS = new Set<CommercialIssue["field"]>(["subscription.featureOverrides", "subscription.overrideExpiresAt"]);
const PAYMENT_SOURCE: CommercialFieldSource = { source: "unavailable", quality: "unavailable", reason: "payment_evidence_unavailable" };
const PRICE_SOURCE: CommercialFieldSource = { source: "unavailable", quality: "unavailable", reason: "subscription_price_snapshot_missing" };

function hasInvalidSource(issues: readonly CommercialIssue[], fields: ReadonlySet<CommercialIssue["field"]>): boolean {
  return issues.some((issue) => issue.code === "invalid_field" && fields.has(issue.field));
}

function recordedSource(value: unknown, field: CommercialIssue["field"], issues: readonly CommercialIssue[]): CommercialFieldSource {
  const source = field.startsWith("tenant.") ? "tenant" : "subscription";
  if (hasInvalidSource(issues, new Set([field]))) return { source, quality: "partial", reason: "source_invalid" };
  return value === null
    ? { source: "none", quality: "unavailable", reason: "source_missing" }
    : { source, quality: "authoritative", reason: "recorded_value" };
}

function aggregateQuality(issues: readonly CommercialIssue[], trialQuality: CommercialQuality, hasSubscription: boolean): CommercialQuality {
  const problem = issues.some((issue) => !["tenant_trial_flag_stale", "legacy_provider_missing"].includes(issue.code));
  if (problem || trialQuality === "partial" || trialQuality === "unavailable") return "partial";
  return !hasSubscription || issues.some((issue) => issue.code === "legacy_provider_missing") ? "legacy" : "authoritative";
}

function planDecision(evidence: CommercialEvidence, now: Date) {
  const invalidSubscription = hasInvalidSource(evidence.issues, SUBSCRIPTION_PLAN_FIELDS);
  const invalidTenant = hasInvalidSource(evidence.issues, TENANT_PLAN_FIELDS);
  // Invalid dates must not become null/no-expiry grants. Independent valid
  // legacy Tenant evidence remains eligible under the shared plan rule.
  const decision = resolveEffectivePlanDecision(invalidSubscription ? null : evidence.subscription, invalidTenant ? null : evidence.tenant, now);
  let quality: CommercialQuality = "authoritative";
  const incomplete = evidence.issues.some((issue) => issue.code === "required_field_missing" && (SUBSCRIPTION_PLAN_FIELDS.has(issue.field) || TENANT_PLAN_FIELDS.has(issue.field)));
  if (invalidSubscription || invalidTenant || incomplete) quality = "partial";
  else if (decision.source === "tenant_legacy" || !evidence.subscription || evidence.subscription.billingProvider === null) quality = "legacy";
  const source: CommercialFieldSource = { source: decision.source, quality, reason: decision.reason };
  return { decision, source };
}

function featureProjection(evidence: CommercialEvidence, plan: ReturnType<typeof planDecision>, now: Date) {
  const overrides = resolveActiveFeatureOverrides(evidence.subscription, now);
  const features = getPlanFeatures(plan.decision.plan, overrides);
  const quality = evidence.issues.some((issue) => OVERRIDE_FIELDS.has(issue.field)) ? "partial" : plan.source.quality;
  const source: CommercialFieldSource = { source: "shared_plan_features", quality, reason: overrides ? "active_feature_overrides" : "shared_plan_features" };
  return { features, source };
}

function capabilityProjection(rawTenant: CommercialTenantInput, evidence: CommercialEvidence, features: PlanFeatures) {
  const tenant = {
    verticals: rawTenant.verticals === undefined ? undefined : (evidence.tenant.verticals ?? []),
    capabilityConfiguration: rawTenant.capabilityConfiguration,
  };
  return {
    verticals: resolveEffectiveVerticals(tenant),
    capabilities: Object.fromEntries(TENANT_CAPABILITIES.map((capability) => [capability, resolveCapability({ tenant, capability, planFeatures: features })])),
  };
}

function providerSource(evidence: CommercialEvidence): CommercialFieldSource {
  const subscription = evidence.subscription;
  if (subscription && subscription.billingProvider === null && !hasInvalidSource(evidence.issues, new Set(["subscription.billingProvider"]))) {
    return { source: "subscription", quality: "legacy", reason: "legacy_internal_default" };
  }
  return recordedSource(subscription?.billingProvider ?? null, "subscription.billingProvider", evidence.issues);
}

function fieldSources(evidence: CommercialEvidence, trial: CommercialTrialState, planSource: CommercialFieldSource, featureSource: CommercialFieldSource): CommercialSubscriptionState["fieldSources"] {
  return {
    tenantStatus: recordedSource(evidence.tenant.status, "tenant.status", evidence.issues),
    effectivePlan: planSource,
    subscriptionStatus: recordedSource(evidence.subscription?.status ?? null, "subscription.status", evidence.issues),
    billingProvider: providerSource(evidence),
    currentPeriodEnd: recordedSource(evidence.subscription?.currentPeriodEnd ?? null, "subscription.currentPeriodEnd", evidence.issues),
    trial: { source: trial.source, quality: trial.quality, reason: trial.reason },
    paidThrough: PAYMENT_SOURCE, lastSuccessfulPayment: PAYMENT_SOURCE, price: PRICE_SOURCE,
    features: featureSource,
    capabilities: { source: "shared_capabilities", quality: evidence.issues.some((issue) => CAPABILITY_FIELDS.has(issue.field)) ? "partial" : featureSource.quality, reason: "shared_capabilities" },
  };
}

/** Internal domain read model; authorization belongs to SALES-2A, not this resolver. */
export function resolveCommercialSubscriptionState(input: CommercialResolverInput & { readonly tenantId: string }): CommercialSubscriptionState {
  assertCommercialNow(input.now);
  const evidence = readCommercialEvidence(input);
  const trial = resolveCommercialTrialState(input);
  evidence.issues = deduplicateCommercialIssues([...evidence.issues, ...trial.issues]);
  const plan = planDecision(evidence, input.now);
  const features = featureProjection(evidence, plan, input.now);
  // Parsing detaches arrays and applies a strict output allowlist. Never expose
  // raw records, provider IDs, override notes, credentials, or customer data.
  return commercialSubscriptionStateSchema.parse({
    schemaVersion: 1, asOf: input.now.toISOString(), tenantId: input.tenantId,
    tenantStatus: evidence.tenant.status,
    effectivePlan: plan.decision.plan, effectivePlanSource: plan.decision.source,
    subscriptionStatus: evidence.subscription?.status ?? null,
    billingProvider: evidence.subscription?.billingProvider ?? null,
    currentPeriodEnd: evidence.subscription?.currentPeriodEnd?.toISOString() ?? null,
    trial,
    paidThrough: { value: null, source: "unavailable", reason: "payment_evidence_unavailable" },
    lastSuccessfulPayment: { value: null, source: "unavailable", reason: "payment_evidence_unavailable" },
    price: { amount: null, currency: null, interval: null, source: "unavailable", reason: "subscription_price_snapshot_missing" },
    features: features.features,
    capabilities: capabilityProjection(input.tenant, evidence, features.features),
    fieldSources: fieldSources(evidence, trial, plan.source, features.source),
    quality: { state: aggregateQuality(evidence.issues, trial.quality, evidence.subscription !== null), issues: evidence.issues },
  });
}
