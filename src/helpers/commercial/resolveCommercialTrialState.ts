import type { CommercialIssue, CommercialResolverInput, CommercialTrialContext, CommercialTrialState } from "@/types/commercial-subscription";
import { assertCommercialNow, readCommercialEvidence } from "./evidence";

const TRIAL_FIELDS = new Set<CommercialIssue["field"]>([
  "tenant.status", "tenant.isTrialActive", "tenant.trialEndsAt",
  "subscription.status", "subscription.billingProvider", "subscription.currentPeriodEnd",
]);
const INFORMATIONAL = new Set<CommercialIssue["code"]>(["tenant_trial_flag_stale", "legacy_provider_missing"]);

function finish(context: CommercialTrialContext, status: CommercialTrialState["status"], source: CommercialTrialState["source"], reason: CommercialTrialState["reason"], endsAt: Date | null = null, quality: CommercialTrialState["quality"] = context.subscription ? "authoritative" : "legacy"): CommercialTrialState {
  return {
    status, source, reason, endsAt: endsAt?.toISOString() ?? null,
    quality: context.issues.some((issue) => !INFORMATIONAL.has(issue.code)) ? "partial" : quality,
    issues: [...context.issues],
  };
}

function hasInvalidField(context: CommercialTrialContext, field: CommercialIssue["field"]): boolean {
  return context.issues.some((issue) => issue.code === "invalid_field" && issue.field === field);
}

function resolveNonTrialing(context: CommercialTrialContext): CommercialTrialState {
  if (context.tenant.isTrialActive === true || context.tenant.trialEndsAt) {
    context.issues.push({ code: "tenant_trial_with_non_trialing_subscription", field: "tenant.isTrialActive" });
  }
  return finish(context, "not_trialing", "subscription_status", "subscription_not_trialing");
}

function recordDateDisagreement(context: CommercialTrialContext): void {
  const tenantEnd = context.tenant.trialEndsAt;
  const periodEnd = context.subscription?.currentPeriodEnd;
  if (tenantEnd && periodEnd && tenantEnd.getTime() !== periodEnd.getTime()) {
    context.issues.push({ code: "trial_dates_disagree", field: "tenant.trialEndsAt" });
  }
}

function resolvePaddleTrial(context: CommercialTrialContext): CommercialTrialState {
  context.issues.push({ code: "paddle_period_not_verified_trial", field: "subscription.currentPeriodEnd" });
  const end = context.subscription?.currentPeriodEnd;
  if (!end) {
    const reason = hasInvalidField(context, "subscription.currentPeriodEnd") ? "trial_end_invalid" : "trial_end_missing";
    return finish(context, "unknown", "subscription_period", reason);
  }
  const active = end > context.now;
  if (!active) context.issues.push({ code: "subscription_still_trialing", field: "subscription.status" });
  return finish(context, active ? "active" : "expired", "subscription_period", active ? "paddle_trial_period_running" : "paddle_trial_period_elapsed", end);
}

function resolveDatedTenantTrial(context: CommercialTrialContext, end: Date): CommercialTrialState {
  const flag = context.tenant.isTrialActive;
  if (flag === null) {
    context.issues.push({ code: "required_field_missing", field: "tenant.isTrialActive" });
    return finish(context, "unknown", "tenant_trial", "trial_evidence_missing", end, "partial");
  }
  if (end <= context.now) {
    if (flag) context.issues.push({ code: "tenant_trial_flag_stale", field: "tenant.isTrialActive" });
    return finish(context, "expired", "tenant_trial", context.subscription ? "tenant_trial_elapsed" : "legacy_tenant_trial_elapsed", end);
  }
  if (flag) return finish(context, "active", "tenant_trial", context.subscription ? "tenant_trial_running" : "legacy_tenant_trial_running", end);
  if (context.subscription) context.issues.push({ code: "tenant_trial_disabled_with_trialing_subscription", field: "tenant.isTrialActive" });
  return finish(context, "inactive", "tenant_trial", "tenant_trial_disabled", end);
}

function resolveUndatedTenantTrial(context: CommercialTrialContext): CommercialTrialState {
  if (context.tenant.isTrialActive === true) {
    context.issues.push({ code: "required_field_missing", field: "tenant.trialEndsAt" });
    return finish(context, "unknown", "tenant_trial", "trial_end_missing");
  }
  if (context.tenant.isTrialActive === false) {
    if (context.tenant.status === "pending") return finish(context, "not_started", "tenant_trial", "tenant_trial_not_started");
    if (!context.subscription) return finish(context, "not_trialing", "tenant_trial", "tenant_trial_not_active");
  }
  if (context.subscription) {
    context.issues.push({ code: "trial_activation_unconfirmed", field: "tenant.isTrialActive" });
    return finish(context, "unknown", "none", "internal_trial_activation_unconfirmed");
  }
  return finish(context, "unknown", "none", "trial_evidence_missing", null, "unavailable");
}

function resolveInternalTrial(context: CommercialTrialContext): CommercialTrialState {
  if (hasInvalidField(context, "tenant.isTrialActive") || hasInvalidField(context, "tenant.trialEndsAt")) {
    const reason = context.tenant.isTrialActive === true ? "trial_end_invalid" : "trial_evidence_invalid";
    return finish(context, "unknown", "tenant_trial", reason);
  }
  if (context.tenant.trialEndsAt) return resolveDatedTenantTrial(context, context.tenant.trialEndsAt);
  return resolveUndatedTenantTrial(context);
}

/** Pure lifecycle read. Period dates never create a trial or payment evidence. */
export function resolveCommercialTrialState(input: CommercialResolverInput): CommercialTrialState {
  assertCommercialNow(input.now);
  const evidence = readCommercialEvidence(input);
  const context: CommercialTrialContext = {
    ...evidence, now: input.now,
    issues: evidence.issues.filter((issue) => TRIAL_FIELDS.has(issue.field) && !(issue.field === "tenant.status" && issue.code === "required_field_missing")),
  };
  const subscription = context.subscription;
  if (subscription && (!subscription.status || hasInvalidField(context, "subscription.billingProvider"))) {
    return finish(context, "unknown", "none", "trial_evidence_invalid", null, "partial");
  }
  if (subscription && subscription.status !== "trialing") return resolveNonTrialing(context);
  recordDateDisagreement(context);
  if (subscription?.billingProvider === "paddle") return resolvePaddleTrial(context);
  return resolveInternalTrial(context);
}
