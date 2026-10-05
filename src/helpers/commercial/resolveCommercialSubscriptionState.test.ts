import { describe, expect, it } from "vitest";
import { getPlanFeatures, resolveActiveFeatureOverrides, resolveEffectivePlan, type PlanName } from "@/lib/plans/planFeatures";
import { resolveCapability } from "@/lib/platform/capabilities";
import { TENANT_CAPABILITIES } from "@/types/tenant-capabilities";
import { commercialSubscriptionStateSchema, type CommercialSubscriptionInput, type CommercialTenantInput } from "@/types/commercial-subscription";
import { resolveCommercialSubscriptionState } from "./resolveCommercialSubscriptionState";

const tenantId = "507f1f77bcf86cd799439011";
const now = new Date("2026-10-05T12:00:00.000Z");
const future = "2026-11-05T12:00:00.000Z";
const past = "2026-09-05T12:00:00.000Z";
const tenant = { status: "active", plan: "maria", paid: false, isTrialActive: false, trialEndsAt: null };
const subscription = { plan: "claudia", status: "active", billingProvider: "internal", currentPeriodEnd: future };
const project = (tenantInput: CommercialTenantInput = tenant, subscriptionInput: CommercialSubscriptionInput | null = subscription, clock = now) => resolveCommercialSubscriptionState({ tenantId, tenant: tenantInput, subscription: subscriptionInput, now: clock });

describe("Commercial subscription projection", () => {
  it("complete sources are authoritative despite intentionally unavailable payment evidence", () => {
    const result = project();
    expect(result).toMatchObject({ schemaVersion: 1, asOf: now.toISOString(), tenantId, effectivePlan: "claudia", effectivePlanSource: "subscription", tenantStatus: "active", subscriptionStatus: "active", billingProvider: "internal", currentPeriodEnd: future, quality: { state: "authoritative", issues: [] } });
    expect(result.fieldSources.effectivePlan).toMatchObject({ source: "subscription", reason: "subscription_grant" });
    expect(commercialSubscriptionStateSchema.safeParse(result).success).toBe(true);
  });
  it.each(["maria", "claudia", "kiki", "enterprise"] as const)("%s never proves price or payment", (plan) => {
    const result = project({ ...tenant, paid: true, plan }, { ...subscription, plan });
    expect(result.price).toEqual({ amount: null, currency: null, interval: null, source: "unavailable", reason: "subscription_price_snapshot_missing" });
    expect(result.paidThrough).toEqual({ value: null, source: "unavailable", reason: "payment_evidence_unavailable" });
    expect(result.lastSuccessfulPayment.value).toBeNull();
    expect(result.fieldSources.price.quality).toBe("unavailable");
    expect(result.fieldSources.paidThrough.quality).toBe("unavailable");
  });
  it("missing Subscription retains truthful legacy grant and null billing fields", () => {
    const result = project({ ...tenant, plan: "kiki", paid: true, planExpiresAt: future }, null);
    expect(result).toMatchObject({ effectivePlan: "kiki", effectivePlanSource: "tenant_legacy", subscriptionStatus: null, billingProvider: null, currentPeriodEnd: null, quality: { state: "legacy" } });
    expect(result.fieldSources.effectivePlan.quality).toBe("legacy");
  });
  it("legacy missing provider stays null while retaining internal expiry semantics", () => {
    const result = project(tenant, { ...subscription, billingProvider: undefined });
    expect(result).toMatchObject({ effectivePlan: "claudia", billingProvider: null, quality: { state: "legacy" } });
    expect(result.fieldSources.billingProvider).toMatchObject({ reason: "legacy_internal_default", quality: "legacy" });
    expect(project(tenant, { ...subscription, billingProvider: undefined, currentPeriodEnd: past }).effectivePlan).toBe("maria");
  });
  it.each([
    ["plan", "unknown"], ["status", "unknown"], ["billingProvider", "unknown"], ["currentPeriodEnd", "not-a-date"],
  ])("invalid internal Subscription %s cannot create a paid grant", (field, value) => {
    const result = project(tenant, { ...subscription, [field]: value });
    expect(result.effectivePlan).toBe("maria");
    expect(result.quality.state).toBe("partial");
    expect(result.quality.issues).toContainEqual({ code: "invalid_field", field: `subscription.${field}` });
    expect(project({ ...tenant, plan: "kiki", paid: true }, { ...subscription, [field]: value }).effectivePlan).toBe("kiki");
  });
  it.each([["plan", "unknown"], ["paid", "true"], ["planExpiresAt", "broken"]])("invalid legacy %s cannot become a no-expiry grant", (field, value) => {
    expect(project({ ...tenant, plan: "kiki", paid: true, [field]: value }, null).effectivePlan).toBe("maria");
  });
  it("missing required source fields stay partial without synthetic defaults", () => {
    const result = project({ isTrialActive: false, trialEndsAt: null }, {});
    expect(result).toMatchObject({ effectivePlan: "maria", tenantStatus: null, subscriptionStatus: null, billingProvider: null, quality: { state: "partial" } });
    expect(result.trial.status).toBe("unknown");
    expect(result.fieldSources.effectivePlan.quality).toBe("partial");
  });
  it("missing internal period preserves the existing grant with partial provenance", () => {
    const result = project(tenant, { ...subscription, currentPeriodEnd: null });
    expect(result).toMatchObject({ effectivePlan: "claudia", currentPeriodEnd: null, quality: { state: "partial" } });
    expect(result.fieldSources.effectivePlan.quality).toBe("partial");
  });
  it("expired Paddle trial period does not change status-driven paid plan behavior", () => {
    const result = project({ ...tenant, isTrialActive: true, trialEndsAt: future }, { ...subscription, status: "trialing", billingProvider: "paddle", currentPeriodEnd: past });
    expect(result).toMatchObject({ effectivePlan: "claudia", subscriptionStatus: "trialing", trial: { status: "expired", source: "subscription_period", quality: "partial" }, paidThrough: { value: null } });
  });
  it.each(["active", "trialing", "past_due"])("Paddle %s retains Claudia with an invalid period and exposes the corrupt field", (status) => {
    const result = project(tenant, { ...subscription, status, billingProvider: "paddle", currentPeriodEnd: "not-a-date" });
    expect(result).toMatchObject({
      effectivePlan: "claudia", effectivePlanSource: "subscription",
      currentPeriodEnd: null, quality: { state: "partial" },
    });
    expect(result.quality.issues).toContainEqual({ code: "invalid_field", field: "subscription.currentPeriodEnd" });
    expect(result.fieldSources.currentPeriodEnd).toEqual({ source: "subscription", quality: "partial", reason: "source_invalid" });
    if (status === "trialing") expect(result.trial).toMatchObject({ status: "unknown", source: "subscription_period", reason: "trial_end_invalid" });
  });
  it("invalid Paddle period does not incorrectly select a valid paid Kiki Tenant fallback", () => {
    const result = project({ ...tenant, plan: "kiki", paid: true, planExpiresAt: future }, { ...subscription, billingProvider: "paddle", currentPeriodEnd: "not-a-date" });
    expect(result).toMatchObject({ effectivePlan: "claudia", effectivePlanSource: "subscription", currentPeriodEnd: null, quality: { state: "partial" } });
    expect(result.quality.issues).toContainEqual({ code: "invalid_field", field: "subscription.currentPeriodEnd" });
  });
  it.each(["internal", undefined, null])("internal/legacy provider %s cannot convert an invalid period into a no-expiry grant", (billingProvider) => {
    const invalidPeriod = { ...subscription, billingProvider, currentPeriodEnd: "not-a-date" };
    const result = project(tenant, invalidPeriod);
    expect(result).toMatchObject({ effectivePlan: "maria", effectivePlanSource: "maria_default", currentPeriodEnd: null, quality: { state: "partial" } });
    expect(result.quality.issues).toContainEqual({ code: "invalid_field", field: "subscription.currentPeriodEnd" });
    expect(project({ ...tenant, plan: "kiki", paid: true, planExpiresAt: future }, invalidPeriod)).toMatchObject({ effectivePlan: "kiki", effectivePlanSource: "tenant_legacy" });
  });
  it.each(["active", "trialing", "past_due"])("Paddle %s elapsed period keeps the status-driven Subscription grant", (status) => {
    expect(project({ ...tenant, plan: "kiki", paid: true }, { ...subscription, status, billingProvider: "paddle", currentPeriodEnd: past })).toMatchObject({ effectivePlan: "claudia", effectivePlanSource: "subscription", currentPeriodEnd: past });
  });
  it("trial cannot independently grant paid features", () => {
    const result = project({ ...tenant, isTrialActive: true, trialEndsAt: future }, { ...subscription, plan: "maria", status: "trialing" });
    expect(result.trial.status).toBe("active");
    expect(result.effectivePlan).toBe("maria");
    expect(result.features).toEqual(getPlanFeatures("maria"));
  });
  it("all temporal decisions use one explicit now at their exact boundary", () => {
    const currentTenant = { ...tenant, isTrialActive: true, trialEndsAt: future };
    const currentSub = { ...subscription, status: "trialing", featureOverrides: { aiAssistant: true, loyaltyCore: true }, overrideExpiresAt: future };
    const before = project(currentTenant, currentSub, new Date(new Date(future).getTime() - 1));
    const at = project(currentTenant, currentSub, new Date(future));
    expect(before).toMatchObject({ effectivePlan: "claudia", trial: { status: "active" }, features: { aiAssistant: true } });
    expect(at).toMatchObject({ effectivePlan: "maria", trial: { status: "expired" }, features: { aiAssistant: false } });
    expect(at.asOf).toBe(future);
  });
  it("reuses shared overrides/capabilities and preserves unavailable distribution", () => {
    const currentTenant = { ...tenant, verticals: ["education"], capabilityConfiguration: { overrides: [{ capability: "education.catalog", enabled: true }, { capability: "loyalty.rewards", enabled: true }] } };
    const currentSub = { ...subscription, plan: "maria", featureOverrides: { loyaltyCore: true }, overrideExpiresAt: future };
    const result = project(currentTenant, currentSub);
    const features = getPlanFeatures("maria", resolveActiveFeatureOverrides(currentSub, now));
    for (const capability of TENANT_CAPABILITIES) {
      expect(result.capabilities.capabilities[capability]).toEqual(resolveCapability({ tenant: currentTenant, capability, planFeatures: features }));
    }
    expect(result.capabilities.capabilities["education.catalog"].enabled).toBe(true);
    expect(result.capabilities.capabilities["distribution.campaigns"]).toMatchObject({ platformAvailable: false, enabled: false });
    expect(result.fieldSources.features.reason).toBe("active_feature_overrides");
  });
  it.each([
    { verticals: ["invalid"] }, { verticals: null }, { capabilityConfiguration: { overrides: [{ capability: "loyalty.rewards", enabled: "true" }] } },
  ])("invalid tenant capability configuration fails closed", (badConfiguration) => {
    const result = project({ ...tenant, ...badConfiguration });
    expect(Object.values(result.capabilities.capabilities).every((capability) => !capability.enabled)).toBe(true);
    expect(result.fieldSources.capabilities.quality).toBe("partial");
  });
  it("invalid feature override is rejected instead of coercing privileges", () => {
    const result = project(tenant, { ...subscription, plan: "maria", featureOverrides: { aiAssistant: "yes" }, overrideExpiresAt: future });
    expect(result.features.aiAssistant).toBe(false);
    expect(result.fieldSources.features.quality).toBe("partial");
  });
  it("outputs detached allowlisted data without mutating inputs or leaking raw invalid values", () => {
    const rawTenant = Object.freeze({ ...tenant, ownerId: "owner-secret", email: "private@example.test", capabilityConfiguration: { overrides: [] } });
    const rawSub = Object.freeze({ ...subscription, status: "private@example.test", paddleCustomerId: "paddle-secret", overrideNote: "private note" });
    const before = JSON.stringify([rawTenant, rawSub, now]);
    const result = project(rawTenant, rawSub);
    expect(project(rawTenant, rawSub)).toEqual(result);
    expect(JSON.stringify(result)).not.toMatch(/private|paddle-secret|owner-secret/);
    result.features.landingThemes.push("test-detached-array");
    expect(project().features.landingThemes).not.toContain("test-detached-array");
    expect(JSON.stringify([rawTenant, rawSub, now])).toBe(before);
    expect(commercialSubscriptionStateSchema.safeParse({ ...result, email: "x" }).success).toBe(false);
  });
  it.each(["pending", "suspended", "cancelled"])("does not activate %s tenant during projection", (status) => {
    expect(project({ ...tenant, status, isTrialActive: true, trialEndsAt: future }, null).tenantStatus).toBe(status);
  });
  it("valid legacy fallback parity with existing effective plan", () => {
    const legacyTenant = { ...tenant, plan: "enterprise" as PlanName, paid: true, planExpiresAt: future };
    expect(project(legacyTenant, null).effectivePlan).toBe(resolveEffectivePlan(null, legacyTenant, now));
  });
});
