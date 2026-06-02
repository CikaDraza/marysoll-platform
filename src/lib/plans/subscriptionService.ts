/**
 * lib/plans/subscriptionService.ts
 *
 * Server-side helper funkcije za rad sa Subscription modelom.
 * Koristi se u API route-ovima i server komponentama.
 *
 * NE importovati u Client Components — za klijentsku stranu koristiti
 * usePlanFeatures hook koji čita /api/subscriptions endpoint.
 */
import "server-only";

import { connectToDB } from "@/lib/db/mongodb";
import { Subscription } from "@/models/Subscription";
import { Tenant } from "@/models/Tenant";
import type { ISubscription } from "@/models/Subscription";
import {
  PLAN_FEATURES,
  getPlanFeatures,
  type PlanName,
  type PlanFeatures,
} from "./planFeatures";

// ─── Dohvati Subscription za tenant ──────────────────────────────────────────

/**
 * Dohvati ili kreira Subscription za tenant.
 * Ako ne postoji (stari tenanti), kreira ga na osnovu Tenant.plan.
 */
export async function getOrCreateSubscription(
  tenantId: string,
): Promise<ISubscription> {
  await connectToDB();

  const existing = await Subscription.findOne({
    tenantId,
  }).lean<ISubscription>();
  if (existing) return existing;

  // Migracija: kreira Subscription za postojeći tenant
  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

  const t = tenant as Record<string, unknown>;
  const plan = (t.plan as PlanName) ?? "maria";
  const isPaid = Boolean(t.paid);
  const isTrialActive = Boolean(t.isTrialActive);

  const status: ISubscription["status"] = isTrialActive
    ? "trialing"
    : isPaid
      ? "active"
      : "expired";

  const sub = await Subscription.create({
    tenantId,
    plan,
    status,
    currentPeriodStart: (t.createdAt as Date) ?? new Date(),
    currentPeriodEnd:
      (t.planExpiresAt as Date) ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    lsSubscriptionId: (t.lemonsqueezySubscriptionId as string) ?? null,
    lsCustomerId: (t.lemonsqueezyCustomerId as string) ?? null,
  });

  return sub.toObject() as ISubscription;
}

// ─── Feature provjere ─────────────────────────────────────────────────────────

/**
 * Dohvati efektivne feature-e za tenant (uključujući superadmin override).
 */
export async function getTenantFeatures(
  tenantId: string,
): Promise<PlanFeatures> {
  const sub = await getOrCreateSubscription(tenantId);

  // Provjeri da li je override istekao
  const overrides =
    sub.featureOverrides &&
    sub.overrideExpiresAt &&
    new Date() < sub.overrideExpiresAt
      ? sub.featureOverrides
      : null;

  return getPlanFeatures(sub.plan, overrides);
}

/**
 * Provjeri da li tenant ima konkretan feature.
 * Brža alternativa getTenantFeatures za provjeru jednog featura.
 */
export async function tenantHasFeature<K extends keyof PlanFeatures>(
  tenantId: string,
  feature: K,
): Promise<boolean> {
  const features = await getTenantFeatures(tenantId);
  const value = features[feature];
  return Boolean(value);
}

// ─── Usage tracking ───────────────────────────────────────────────────────────

/**
 * Povećaj broj AI zahteva za ovaj mjesec.
 * Vraća true ako je zahtjev dozvoljen, false ako je limit prekoračen.
 */
export async function consumeAiRequest(tenantId: string): Promise<boolean> {
  const sub = await getOrCreateSubscription(tenantId);
  const features = getPlanFeatures(sub.plan, sub.featureOverrides);

  if (features.unlimitedAiTokens) return true;
  if (features.aiRequestsPerMonth === 0) return false;
  if (features.aiRequestsPerMonth === -1) return true;

  // Resetuj brojač ako je novi mjesec
  const now = new Date();
  const resetAt = new Date(sub.usage.aiRequestsResetAt);
  const isNewMonth =
    now.getMonth() !== resetAt.getMonth() ||
    now.getFullYear() !== resetAt.getFullYear();

  if (isNewMonth) {
    await Subscription.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          "usage.aiRequestsThisMonth": 1,
          "usage.aiRequestsResetAt": now,
        },
      },
    );
    return true;
  }

  if (sub.usage.aiRequestsThisMonth >= features.aiRequestsPerMonth) {
    return false;
  }

  await Subscription.findOneAndUpdate(
    { tenantId },
    { $inc: { "usage.aiRequestsThisMonth": 1 } },
  );
  return true;
}

// ─── Superadmin override ──────────────────────────────────────────────────────

export interface OverrideParams {
  overrides: Partial<PlanFeatures>;
  expiresAt: Date;
  note: string;
}

export async function setFeatureOverride(
  tenantId: string,
  params: OverrideParams,
): Promise<void> {
  await connectToDB();
  await Subscription.findOneAndUpdate(
    { tenantId },
    {
      $set: {
        featureOverrides: params.overrides,
        overrideExpiresAt: params.expiresAt,
        overrideNote: params.note,
      },
    },
    { upsert: false },
  );
}

export async function clearFeatureOverride(tenantId: string): Promise<void> {
  await connectToDB();
  await Subscription.findOneAndUpdate(
    { tenantId },
    {
      $set: {
        featureOverrides: null,
        overrideExpiresAt: null,
        overrideNote: null,
      },
    },
  );
}

// ─── LemonSqueezy sync ────────────────────────────────────────────────────────

/**
 * Sinkronizuj Subscription sa LemonSqueezy webhook podacima.
 * Poziva se iz webhooks/lemonsqueezy/route.ts
 */
export async function syncSubscriptionFromLs(params: {
  tenantId: string;
  plan: PlanName;
  status: ISubscription["status"];
  lsSubscriptionId: string;
  lsCustomerId: string;
  lsVariantId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<void> {
  await connectToDB();

  await Subscription.findOneAndUpdate(
    { tenantId: params.tenantId },
    {
      $set: {
        plan: params.plan,
        status: params.status,
        lsSubscriptionId: params.lsSubscriptionId,
        lsCustomerId: params.lsCustomerId,
        lsVariantId: params.lsVariantId,
        currentPeriodStart: params.periodStart,
        currentPeriodEnd: params.periodEnd,
      },
    },
    { upsert: true },
  );
}

// ─── Pricing info (za pricing page) ──────────────────────────────────────────

export function getAllPlanFeatures(): Record<PlanName, PlanFeatures> {
  return PLAN_FEATURES;
}
