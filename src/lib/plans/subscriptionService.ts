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
  getPlanFeatures,
  resolveEffectivePlan,
  type PlanName,
  type PlanFeatures,
} from "./planFeatures";

/**
 * Efektivni plan tenanta — ista resolucija kao requireFeature i
 * /api/subscriptions/features (status-aware + Tenant fallback).
 */
async function getEffectivePlan(
  sub: ISubscription,
  tenantId: string,
): Promise<PlanName> {
  const tenant = await Tenant.findById(tenantId)
    .select("plan paid planExpiresAt")
    .lean<{
      plan?: PlanName;
      paid?: boolean;
      planExpiresAt?: Date | null;
    }>();
  return resolveEffectivePlan(sub, tenant);
}

// ─── Dohvati Subscription za tenant ──────────────────────────────────────────

/**
 * Dohvati ili kreira Subscription za tenant.
 * Ako ne postoji (stari tenanti), kreira ga na osnovu Tenant.plan.
 */
async function getOrCreateSubscription(
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
  });

  return sub.toObject() as ISubscription;
}

// ─── Feature provjere ─────────────────────────────────────────────────────────

/**
 * Dohvati efektivne feature-e za tenant (uključujući superadmin override).
 */
async function getTenantFeatures(
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

  return getPlanFeatures(await getEffectivePlan(sub, tenantId), overrides);
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

// ─── Paddle sync ──────────────────────────────────────────────────────────────

/**
 * Sinkronizuj Subscription sa Paddle webhook podacima.
 * Poziva se iz lib/paddle.ts (api/paddle/webhook/route.ts).
 */
export async function syncSubscriptionFromPaddle(params: {
  tenantId: string;
  plan: PlanName;
  status: ISubscription["status"];
  paddleSubscriptionId: string;
  paddleCustomerId: string | null;
  paddleProductId: string | null;
  paddlePriceId: string | null;
  periodStart: Date;
  periodEnd: Date;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  await connectToDB();

  await Subscription.findOneAndUpdate(
    { tenantId: params.tenantId },
    {
      $set: {
        plan: params.plan,
        status: params.status,
        billingProvider: "paddle",
        paddleSubscriptionId: params.paddleSubscriptionId,
        paddleCustomerId: params.paddleCustomerId,
        paddleProductId: params.paddleProductId,
        paddlePriceId: params.paddlePriceId,
        currentPeriodStart: params.periodStart,
        currentPeriodEnd: params.periodEnd,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd,
      },
    },
    { upsert: true },
  );
}

/**
 * Označi Subscription kao otkazanu (Paddle subscription.canceled).
 * Plan se vraća na "maria" — otkazana pretplata ne sme da nastavi da
 * otključava plaćene funkcionalnosti.
 */
export async function cancelSubscriptionFromPaddle(params: {
  tenantId: string;
  periodEnd: Date;
}): Promise<void> {
  await connectToDB();

  await Subscription.findOneAndUpdate(
    { tenantId: params.tenantId },
    {
      $set: {
        plan: "maria",
        status: "cancelled",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: params.periodEnd,
      },
    },
  );
}

