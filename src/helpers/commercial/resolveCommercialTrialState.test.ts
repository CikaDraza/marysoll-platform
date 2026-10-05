import { describe, expect, it } from "vitest";
import type { CommercialResolverInput, CommercialTrialState } from "@/types/commercial-subscription";
import { resolveCommercialTrialState } from "./resolveCommercialTrialState";

const NOW = new Date("2026-10-05T12:00:00.000Z");
const FUTURE = "2026-10-06T12:00:00.000Z";
const PAST = "2026-10-04T12:00:00.000Z";
const tenant = { status: "active", plan: "maria", paid: false, isTrialActive: true, trialEndsAt: FUTURE };
const subscription = { plan: "maria", status: "trialing", billingProvider: "internal", currentPeriodEnd: FUTURE };

const cases: Array<{
  name: string; tenant?: CommercialResolverInput["tenant"]; subscription?: CommercialResolverInput["subscription"];
  status: CommercialTrialState["status"]; source: CommercialTrialState["source"]; reason: CommercialTrialState["reason"];
  quality: CommercialTrialState["quality"]; issue?: string; endsAt?: string | null;
}> = [
  { name: "internal future", status: "active", source: "tenant_trial", reason: "tenant_trial_running", quality: "authoritative", endsAt: FUTURE },
  { name: "internal elapsed", tenant: { ...tenant, trialEndsAt: PAST }, subscription: { ...subscription, currentPeriodEnd: PAST }, status: "expired", source: "tenant_trial", reason: "tenant_trial_elapsed", quality: "authoritative", issue: "tenant_trial_flag_stale", endsAt: PAST },
  { name: "expiry at now", tenant: { ...tenant, trialEndsAt: NOW }, subscription: { ...subscription, currentPeriodEnd: NOW }, status: "expired", source: "tenant_trial", reason: "tenant_trial_elapsed", quality: "authoritative", endsAt: NOW.toISOString() },
  { name: "manual extension outranks internal period", subscription: { ...subscription, currentPeriodEnd: PAST }, status: "active", source: "tenant_trial", reason: "tenant_trial_running", quality: "partial", issue: "trial_dates_disagree", endsAt: FUTURE },
  { name: "elapsed Tenant outranks internal period", tenant: { ...tenant, trialEndsAt: PAST }, status: "expired", source: "tenant_trial", reason: "tenant_trial_elapsed", quality: "partial", issue: "trial_dates_disagree", endsAt: PAST },
  { name: "different future dates still conflict", subscription: { ...subscription, currentPeriodEnd: "2026-10-07T12:00:00.000Z" }, status: "active", source: "tenant_trial", reason: "tenant_trial_running", quality: "partial", issue: "trial_dates_disagree" },
  { name: "provisional registration is not start", tenant: { ...tenant, status: "pending", isTrialActive: false, trialEndsAt: null }, status: "not_started", source: "tenant_trial", reason: "tenant_trial_not_started", quality: "authoritative", endsAt: null },
  { name: "pending without Subscription", tenant: { ...tenant, status: "pending", isTrialActive: false, trialEndsAt: null }, subscription: null, status: "not_started", source: "tenant_trial", reason: "tenant_trial_not_started", quality: "legacy" },
  { name: "false future means disabled", tenant: { ...tenant, isTrialActive: false }, status: "inactive", source: "tenant_trial", reason: "tenant_trial_disabled", quality: "partial", issue: "tenant_trial_disabled_with_trialing_subscription" },
  { name: "legacy disabled", tenant: { ...tenant, isTrialActive: false }, subscription: null, status: "inactive", source: "tenant_trial", reason: "tenant_trial_disabled", quality: "legacy" },
  { name: "false past remains elapsed", tenant: { ...tenant, isTrialActive: false, trialEndsAt: PAST }, subscription: { ...subscription, currentPeriodEnd: PAST }, status: "expired", source: "tenant_trial", reason: "tenant_trial_elapsed", quality: "authoritative" },
  { name: "internal unconfirmed active Tenant", tenant: { ...tenant, isTrialActive: false, trialEndsAt: null }, status: "unknown", source: "none", reason: "internal_trial_activation_unconfirmed", quality: "partial", issue: "trial_activation_unconfirmed" },
  { name: "internal unconfirmed suspended Tenant", tenant: { ...tenant, status: "suspended", isTrialActive: false, trialEndsAt: null }, status: "unknown", source: "none", reason: "internal_trial_activation_unconfirmed", quality: "partial" },
  { name: "legacy active", subscription: null, status: "active", source: "tenant_trial", reason: "legacy_tenant_trial_running", quality: "legacy", endsAt: FUTURE },
  { name: "legacy elapsed", tenant: { ...tenant, trialEndsAt: PAST }, subscription: null, status: "expired", source: "tenant_trial", reason: "legacy_tenant_trial_elapsed", quality: "legacy", issue: "tenant_trial_flag_stale" },
  { name: "legacy not active", tenant: { ...tenant, isTrialActive: false, trialEndsAt: null }, subscription: null, status: "not_trialing", source: "tenant_trial", reason: "tenant_trial_not_active", quality: "legacy" },
  { name: "both trial sources absent", tenant: {}, subscription: null, status: "unknown", source: "none", reason: "trial_evidence_missing", quality: "unavailable" },
  { name: "true with null date", tenant: { ...tenant, trialEndsAt: null }, status: "unknown", source: "tenant_trial", reason: "trial_end_missing", quality: "partial", issue: "required_field_missing" },
  { name: "true with invalid date", tenant: { ...tenant, trialEndsAt: "broken" }, status: "unknown", source: "tenant_trial", reason: "trial_end_invalid", quality: "partial", issue: "invalid_field" },
  { name: "invalid Date instance", tenant: { ...tenant, trialEndsAt: new Date(NaN) }, status: "unknown", source: "tenant_trial", reason: "trial_end_invalid", quality: "partial" },
  { name: "no flag with date", tenant: { ...tenant, isTrialActive: undefined }, status: "unknown", source: "tenant_trial", reason: "trial_evidence_missing", quality: "partial", endsAt: FUTURE },
  { name: "truthy string is not activation", tenant: { ...tenant, isTrialActive: "true" }, status: "unknown", source: "tenant_trial", reason: "trial_evidence_invalid", quality: "partial" },
  { name: "no internal activation fields", tenant: { status: "active" }, status: "unknown", source: "none", reason: "internal_trial_activation_unconfirmed", quality: "partial" },
  { name: "unknown provider", subscription: { ...subscription, billingProvider: "other" }, status: "unknown", source: "none", reason: "trial_evidence_invalid", quality: "partial" },
  { name: "unknown status", subscription: { ...subscription, status: "garbage" }, status: "unknown", source: "none", reason: "trial_evidence_invalid", quality: "partial" },
  { name: "missing status is not missing Subscription", subscription: { ...subscription, status: undefined }, status: "unknown", source: "none", reason: "trial_evidence_invalid", quality: "partial" },
  { name: "legacy missing provider uses internal authority", subscription: { ...subscription, billingProvider: undefined }, status: "active", source: "tenant_trial", reason: "tenant_trial_running", quality: "authoritative", issue: "legacy_provider_missing" },
  { name: "Paddle future", subscription: { ...subscription, billingProvider: "paddle" }, status: "active", source: "subscription_period", reason: "paddle_trial_period_running", quality: "partial", issue: "paddle_period_not_verified_trial", endsAt: FUTURE },
  { name: "Paddle ignores local elapsed date", tenant: { ...tenant, trialEndsAt: PAST }, subscription: { ...subscription, billingProvider: "paddle" }, status: "active", source: "subscription_period", reason: "paddle_trial_period_running", quality: "partial", issue: "trial_dates_disagree", endsAt: FUTURE },
  { name: "Paddle ignores local disabled flag", tenant: { ...tenant, isTrialActive: false }, subscription: { ...subscription, billingProvider: "paddle" }, status: "active", source: "subscription_period", reason: "paddle_trial_period_running", quality: "partial" },
  { name: "Paddle expires despite future Tenant", subscription: { ...subscription, billingProvider: "paddle", currentPeriodEnd: PAST }, status: "expired", source: "subscription_period", reason: "paddle_trial_period_elapsed", quality: "partial", issue: "subscription_still_trialing", endsAt: PAST },
  { name: "Paddle exact expiry", subscription: { ...subscription, billingProvider: "paddle", currentPeriodEnd: NOW }, status: "expired", source: "subscription_period", reason: "paddle_trial_period_elapsed", quality: "partial" },
  { name: "Paddle missing period", subscription: { ...subscription, billingProvider: "paddle", currentPeriodEnd: null }, status: "unknown", source: "subscription_period", reason: "trial_end_missing", quality: "partial", endsAt: null },
  { name: "Paddle invalid period", subscription: { ...subscription, billingProvider: "paddle", currentPeriodEnd: "broken" }, status: "unknown", source: "subscription_period", reason: "trial_end_invalid", quality: "partial" },
  ...["active", "past_due", "cancelled", "paused", "expired"].map((status) => ({ name: `${status} suppresses stale trial`, subscription: { ...subscription, status, billingProvider: "paddle" }, status: "not_trialing" as const, source: "subscription_status" as const, reason: "subscription_not_trialing" as const, quality: "partial" as const, issue: "tenant_trial_with_non_trialing_subscription", endsAt: null })),
  { name: "non-trialing with no stale trial", tenant: { ...tenant, isTrialActive: false, trialEndsAt: null }, subscription: { ...subscription, status: "active", billingProvider: "paddle" }, status: "not_trialing", source: "subscription_status", reason: "subscription_not_trialing", quality: "authoritative" },
];

describe("Commercial trial authority matrix", () => {
  it.each(cases)("$name", (row) => {
    const result = resolveCommercialTrialState({ tenant: row.tenant ?? tenant, subscription: row.subscription === undefined ? subscription : row.subscription, now: NOW });
    expect(result).toMatchObject({ status: row.status, source: row.source, reason: row.reason, quality: row.quality });
    if (row.endsAt !== undefined) expect(result.endsAt).toBe(row.endsAt);
    if (row.issue) expect(result.issues.some((issue) => issue.code === row.issue)).toBe(true);
  });
  it("uses only explicit now and never mutates frozen evidence", () => {
    const frozenTenant = Object.freeze({ ...tenant, trialEndsAt: new Date(FUTURE) });
    const frozenSub = Object.freeze({ ...subscription, currentPeriodEnd: new Date(FUTURE) });
    const before = JSON.stringify([frozenTenant, frozenSub, NOW]);
    const input = Object.freeze({ tenant: frozenTenant, subscription: frozenSub, now: NOW });
    expect(resolveCommercialTrialState(input)).toEqual(resolveCommercialTrialState(input));
    expect(resolveCommercialTrialState({ ...input, now: new Date(FUTURE) }).status).toBe("expired");
    expect(JSON.stringify([frozenTenant, frozenSub, NOW])).toBe(before);
  });
  it("rejects invalid clock rather than using wall time", () => {
    expect(() => resolveCommercialTrialState({ tenant, subscription, now: new Date(NaN) })).toThrow(TypeError);
  });
});
