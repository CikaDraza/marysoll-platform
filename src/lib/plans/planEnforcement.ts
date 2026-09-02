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
 * Plan se rešava kroz resolveEffectivePlan (planFeatures.ts) — ista logika
 * kao u /api/subscriptions/features, status-aware (otkazana/istekla pretplata
 * pada na "maria"), uz Tenant fallback za superadmin ručne dodele.
 */
import "server-only";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Subscription } from "@/models/Subscription";
import { Tenant } from "@/models/Tenant";
import {
  getPlanFeatures,
  resolveActiveFeatureOverrides,
  resolveEffectivePlan,
} from "@/lib/plans/planFeatures";
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
    const { plan, features } = await resolveTenantPlanFeatures(tenantId);
    const allowed = Boolean(features[feature]);

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

/** Jedan DB read za sve feature odluke u složenom server read-modelu. */
export async function resolveTenantPlanFeatures(
  tenantId: string,
): Promise<{ plan: PlanName; features: PlanFeatures }> {
  await connectToDB();
  const [subscriptionRaw, tenantRaw] = await Promise.all([
    Subscription.findOne({ tenantId }).lean(),
    Tenant.findById(tenantId).select("plan paid planExpiresAt").lean(),
  ]);
  const subscription = subscriptionRaw as {
    plan?: PlanName;
    status?: string;
    billingProvider?: string;
    currentPeriodEnd?: Date | string;
    featureOverrides?: Partial<PlanFeatures>;
    overrideExpiresAt?: Date | string;
  } | null;
  const tenant = tenantRaw as {
    plan?: PlanName;
    paid?: boolean;
    planExpiresAt?: Date | string | null;
  } | null;
  const plan = resolveEffectivePlan(subscription, tenant);
  return {
    plan,
    features: getPlanFeatures(
      plan,
      resolveActiveFeatureOverrides(subscription),
    ),
  };
}

const UPGRADE_MESSAGES: Partial<Record<keyof PlanFeatures, string>> = {
  clientInsights: "Nadogradite na Kiki plan za napredni Client 360 uvid",
  newsletterCampaigns: "Nadogradite na Claudia plan za kreiranje kampanja",
  newsletterLanding: "Nadogradite na Claudia plan za landing stranice",
  aiEmailTemplates: "Nadogradite na Kiki plan za AI generisanje email templejta",
  aiImageGeneration: "Nadogradite na Kiki plan za AI generisanje slika",
  aiSeoGeneration: "Nadogradite na Kiki plan za AI SEO generisanje",
  aiLandingPages: "Nadogradite na Kiki plan za AI landing stranice",
  aiMarketingAnalysis: "Nadogradite na Kiki plan za AI marketinšku analizu",
  loyaltyCore: "Nadogradite na Claudia plan za program nagrađivanja",
  loyaltySystem: "Nadogradite na Kiki plan za napredni loyalty sistem",
  loyaltyRevenue: "Nadogradite na Enterprise plan za dynamic pricing",
};
