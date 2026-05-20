/**
 * lib/plans/planEnforcement.ts
 *
 * SERVER-ONLY utility for enforcing plan feature gates in API routes.
 *
 * Usage in API route handlers (call after requireAdmin):
 *
 *   const denied = await requireFeature(decoded.tenantId, "newsletterCampaigns");
 *   if (denied) return denied;
 *
 * Plan resolution order:
 *   1. Subscription.plan  — authoritative when record exists and is synced
 *   2. Tenant.plan        — fallback when no Subscription record found
 *   3. "free"             — last resort if neither record found
 *
 * The Subscription/Tenant mismatch happens when a superadmin edits Tenant.plan
 * directly without triggering the LemonSqueezy webhook that syncs Subscription.
 * In that case we use Tenant.plan so manual upgrades are respected immediately.
 */
import "server-only";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Subscription } from "@/models/Subscription";
import { Tenant } from "@/models/Tenant";
import { planHasFeature } from "@/lib/plans/planFeatures";
import type { PlanFeatures, PlanName } from "@/lib/plans/planFeatures";

/**
 * Checks whether the tenant's active plan includes the given feature.
 *
 * Returns null if the feature is allowed.
 * Returns a 403 NextResponse if blocked.
 * Returns a 500 NextResponse if the plan lookup itself fails — never throws.
 */
export async function requireFeature(
  tenantId: string | null | undefined,
  feature: keyof PlanFeatures,
): Promise<NextResponse | null> {
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant nije identifikovan" },
      { status: 403 },
    );
  }

  try {
    await connectToDB();

    const [subscriptionRaw, tenantRaw] = await Promise.all([
      Subscription.findOne({ tenantId }).lean(),
      Tenant.findById(tenantId).select("plan paid").lean(),
    ]);
    const subscription = subscriptionRaw as {
      plan?: PlanName;
      featureOverrides?: Partial<PlanFeatures>;
      overrideExpiresAt?: Date | string;
    } | null;
    const tenant = tenantRaw as { plan?: PlanName; paid?: boolean } | null;

    const plan: PlanName = resolvePlan(subscription, tenant);

    const overrides =
      subscription?.featureOverrides &&
      subscription?.overrideExpiresAt &&
      new Date(subscription.overrideExpiresAt) > new Date()
        ? subscription.featureOverrides
        : null;

    const allowed = planHasFeature(plan, feature, overrides);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Vaš plan ne uključuje ovu funkcionalnost",
          feature,
          plan,
          upgrade:
            UPGRADE_MESSAGES[feature] ??
            "Nadogradite plan za pristup ovoj funkciji",
        },
        { status: 403 },
      );
    }

    return null;
  } catch (err) {
    console.error("[requireFeature] Plan lookup failed:", err);
    return NextResponse.json(
      { error: "Greška pri provjeri plana" },
      { status: 500 },
    );
  }
}

/**
 * Resolves the effective plan for a tenant.
 *
 * Uses Subscription.plan when it is a paid/active plan.
 * Falls back to Tenant.plan when Subscription is absent or shows "free"
 * while the Tenant record indicates a paid upgrade — this handles the case
 * where Subscription was never synced after a manual Tenant plan edit.
 */
function resolvePlan(
  subscription: { plan?: PlanName } | null,
  tenant: { plan?: PlanName; paid?: boolean } | null,
): PlanName {
  const subPlan = subscription?.plan ?? null;
  const tenantPlan = tenant?.plan ?? "free";
  const tenantPaid = tenant?.paid ?? false;

  // Subscription is the authoritative source when it has a paid plan.
  if (subPlan && subPlan !== "free") return subPlan;

  // Subscription says "free" but Tenant shows a paid plan → Tenant was updated
  // directly (e.g. by superadmin) without syncing the Subscription record.
  // Use Tenant.plan to avoid blocking a legitimately upgraded tenant.
  if (tenantPaid && tenantPlan !== "free") return tenantPlan;

  return subPlan ?? "free";
}

const UPGRADE_MESSAGES: Partial<Record<keyof PlanFeatures, string>> = {
  newsletterCampaigns: "Nadogradite na Starter plan za kreiranje kampanja",
  newsletterLanding: "Nadogradite na Pro plan za landing stranice",
  aiEmailTemplates: "Nadogradite na Pro plan za AI generisanje email templejta",
  aiImageGeneration: "Nadogradite na Pro plan za AI generisanje slika",
  aiSeoGeneration: "Nadogradite na Pro plan za AI SEO generisanje",
  aiLandingPages: "Nadogradite na Pro plan za AI landing stranice",
  aiMarketingAnalysis: "Nadogradite na Pro plan za AI marketinšku analizu",
};
