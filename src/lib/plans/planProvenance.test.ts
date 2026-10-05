import { describe, expect, it } from "vitest";
import { resolveEffectivePlan, resolveEffectivePlanDecision } from "./planFeatures";
import type { EffectivePlanSubscriptionInput, EffectivePlanTenantInput } from "@/types/plan-resolution";

const now = new Date("2026-10-05T12:00:00Z");
const past = "2026-10-04T12:00:00Z";
const future = "2026-10-06T12:00:00Z";
const paidTenant: EffectivePlanTenantInput = { plan: "kiki", paid: true, planExpiresAt: future };
const cases: Array<{ name: string; sub: EffectivePlanSubscriptionInput | null; tenant?: EffectivePlanTenantInput; plan: string; source: string }> = [
  { name: "none", sub: null, plan: "maria", source: "maria_default" },
  { name: "legacy paid", sub: null, tenant: paidTenant, plan: "kiki", source: "tenant_legacy" },
  { name: "legacy expired", sub: null, tenant: { ...paidTenant, planExpiresAt: past }, plan: "maria", source: "maria_default" },
  { name: "legacy equality expired", sub: null, tenant: { ...paidTenant, planExpiresAt: now }, plan: "maria", source: "maria_default" },
  { name: "legacy perpetual", sub: null, tenant: { ...paidTenant, planExpiresAt: null }, plan: "kiki", source: "tenant_legacy" },
  { name: "unpaid", sub: null, tenant: { ...paidTenant, paid: false }, plan: "maria", source: "maria_default" },
  { name: "Maria Subscription permits tenant fallback", sub: { plan: "maria", status: "active" }, tenant: paidTenant, plan: "kiki", source: "tenant_legacy" },
  { name: "internal expiry permits tenant fallback", sub: { plan: "claudia", status: "active", billingProvider: "internal", currentPeriodEnd: past }, tenant: paidTenant, plan: "kiki", source: "tenant_legacy" },
  ...["active", "trialing", "past_due"].flatMap((status) => [
    { name: `${status} internal future`, sub: { plan: "claudia" as const, status, billingProvider: "internal", currentPeriodEnd: future }, tenant: paidTenant, plan: "claudia", source: "subscription" },
    { name: `${status} internal expired`, sub: { plan: "claudia" as const, status, billingProvider: "internal", currentPeriodEnd: past }, plan: "maria", source: "maria_default" },
    { name: `${status} internal equality`, sub: { plan: "claudia" as const, status, billingProvider: "internal", currentPeriodEnd: now }, plan: "maria", source: "maria_default" },
    { name: `${status} missing internal period preserves grant`, sub: { plan: "claudia" as const, status }, plan: "claudia", source: "subscription" },
    { name: `${status} Paddle status grants despite elapsed period`, sub: { plan: "claudia" as const, status, billingProvider: "paddle", currentPeriodEnd: past }, plan: "claudia", source: "subscription" },
  ]),
  ...["cancelled", "paused", "expired"].flatMap((status) => [
    { name: `${status} no grant`, sub: { plan: "enterprise" as const, status, billingProvider: "paddle", currentPeriodEnd: future }, plan: "maria", source: "maria_default" },
    { name: `${status} allows independent Tenant fallback`, sub: { plan: "enterprise" as const, status, billingProvider: "paddle", currentPeriodEnd: future }, tenant: paidTenant, plan: "kiki", source: "tenant_legacy" },
  ]),
];

describe("shared plan provenance preserves existing entitlement behavior", () => {
  it.each(cases)("$name", ({ sub, tenant, plan, source }) => {
    expect(resolveEffectivePlan(sub, tenant, now)).toBe(plan);
    expect(resolveEffectivePlanDecision(sub, tenant, now)).toMatchObject({ plan, source });
  });
});
