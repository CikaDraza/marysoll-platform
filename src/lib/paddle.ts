import "server-only";

/**
 * Paddle (Billing) integracija
 * Handle subscription lifecycle: created, activated, updated, canceled
 *
 * Plan se određuje preko price/product ID-eva sačuvanih na Plan modelu
 * (paddleMonthlyPriceId / paddleYearlyPriceId / paddleProductId).
 * Tenant se određuje preko custom_data.tenant_id (proslijeđenog na checkout-u),
 * a kao fallback preko postojećeg Subscription.paddleSubscriptionId.
 */

import crypto from "crypto";
import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { Plan } from "@/models/Plan";
import { Subscription } from "@/models/Subscription";
import {
  syncSubscriptionFromPaddle,
  cancelSubscriptionFromPaddle,
} from "@/lib/plans/subscriptionService";
import { notifySubscriptionCancelled } from "@/lib/plans/subscriptionNotifications";
import type { PlanName } from "@/lib/plans/planFeatures";
import type { ISubscription } from "@/models/Subscription";

// ─── Tipovi (Paddle Billing webhook payload) ─────────────────────────────────

interface PaddleSubscriptionEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: {
    id: string;
    status: string; // active | trialing | past_due | paused | canceled
    customer_id: string | null;
    custom_data?: { tenant_id?: string; tenant_slug?: string } | null;
    current_billing_period?: {
      starts_at: string;
      ends_at: string;
    } | null;
    canceled_at?: string | null;
    scheduled_change?: {
      action: "cancel" | "pause" | "resume";
      effective_at: string;
      resume_at?: string | null;
    } | null;
    items?: Array<{
      price?: { id?: string; product_id?: string } | null;
      product?: { id?: string } | null;
    }>;
  };
}

// ─── Paddle API ──────────────────────────────────────────────────────────────

/**
 * Da li je aktivno sandbox okruženje.
 * Jedan izvor istine za server i klijent: NEXT_PUBLIC_PADDLE_ENV
 * (vrednost "sandbox"|"production" nije tajna; server je čita runtime-om).
 */
export function isPaddleSandbox(): boolean {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox";
}

/** Base URL Paddle API-ja na osnovu PADDLE_ENV (sandbox | production). */
export function getPaddleApiBase(): string {
  return isPaddleSandbox()
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

/** Server API key za aktivno okruženje. */
function getPaddleApiKey(): string | undefined {
  return isPaddleSandbox()
    ? process.env.PADDLE_TEST_API_KEY
    : process.env.PADDLE_API_KEY;
}

/** Webhook signing secret za aktivno okruženje. */
export function getPaddleWebhookSecret(): string {
  return (
    (isPaddleSandbox()
      ? process.env.PADDLE_TEST_WEBHOOK_SECRET
      : process.env.PADDLE_WEBHOOK_SECRET) ?? ""
  );
}

/** Zajednički helper za Paddle API pozive (Bearer auth, baca na non-2xx). */
async function paddleApi(
  path: string,
  init: { method: string; body?: unknown },
): Promise<Record<string, unknown>> {
  const apiKey = getPaddleApiKey();
  if (!apiKey)
    throw new Error(
      `Paddle API key nije definisan (${isPaddleSandbox() ? "PADDLE_TEST_API_KEY" : "PADDLE_API_KEY"})`,
    );

  const res = await fetch(`${getPaddleApiBase()}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Paddle API ${res.status} ${path}: ${JSON.stringify(json?.error ?? json)}`,
    );
  }
  return json;
}

/**
 * Pronađi Paddle customer-a po emailu, ili ga kreiraj ako ne postoji.
 * Vraća customer_id, ili null ako lookup/create padne (ne blokira checkout —
 * Paddle će tada prikupiti email na samom checkout-u).
 */
async function resolveOrCreatePaddleCustomer(
  email: string,
): Promise<string | null> {
  try {
    const found = (await paddleApi(
      `/customers?email=${encodeURIComponent(email)}`,
      { method: "GET" },
    )) as { data?: Array<{ id: string }> };
    if (found.data && found.data.length > 0) return found.data[0].id;

    const created = (await paddleApi("/customers", {
      method: "POST",
      body: { email },
    })) as { data?: { id: string } };
    return created.data?.id ?? null;
  } catch (err) {
    console.error("[PADDLE] resolveOrCreatePaddleCustomer:", err);
    return null;
  }
}

/**
 * Kreira Paddle transakciju (draft) za checkout i vraća njen ID + hosted
 * checkout URL (`transaction.checkout.url`, popunjen ako je u Paddle-u
 * podešen Default Payment Link). Korisnik se preusmerava na taj URL.
 *
 * custom_data se propagira na sve subscription webhook-e (tenant_id, plan_code).
 */
export async function createPaddleTransaction(params: {
  priceId: string;
  tenantId: string;
  planCode: string;
  customerId?: string | null;
  customerEmail?: string | null;
}): Promise<{ id: string; checkoutUrl: string | null }> {
  // Ponovo iskoristi postojećeg Paddle customer-a; inače ga nađi/kreiraj po emailu.
  let customerId = params.customerId ?? null;
  if (!customerId && params.customerEmail) {
    customerId = await resolveOrCreatePaddleCustomer(params.customerEmail);
  }

  const body: Record<string, unknown> = {
    items: [{ price_id: params.priceId, quantity: 1 }],
    custom_data: { tenant_id: params.tenantId, plan_code: params.planCode },
  };
  if (customerId) body.customer_id = customerId;

  const json = (await paddleApi("/transactions", {
    method: "POST",
    body,
  })) as {
    data: { id: string; checkout?: { url?: string | null } | null };
  };

  return {
    id: json.data.id,
    checkoutUrl: json.data.checkout?.url ?? null,
  };
}

// ─── Signature verification ──────────────────────────────────────────────────

/**
 * Verifikuje `Paddle-Signature` header (format: `ts=...;h1=...`).
 * HMAC-SHA256 nad `${ts}:${rawBody}` mora odgovarati h1.
 */
export function verifyPaddleSignature({
  rawBody,
  signature,
  secret,
}: {
  rawBody: string;
  signature: string | null;
  secret: string;
}): boolean {
  if (!signature || !secret) return false;

  const parts = Object.fromEntries(
    signature.split(";").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );

  const ts = parts.ts;
  const h1 = parts.h1;

  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(h1, "hex"),
    );
  } catch {
    // h1 nije validan hex / pogrešna dužina
    return false;
  }
}

// ─── Helperi ───────────────────────────────────────────────────────────────

/** Mapira Paddle status na interni SubscriptionStatus. */
function mapPaddleStatus(status: string): ISubscription["status"] {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
      return "cancelled";
    default:
      return "expired";
  }
}

/** Pronađi tenantId: prvo iz custom_data, pa fallback na postojeći Subscription. */
async function resolveTenantId(
  data: PaddleSubscriptionEvent["data"],
): Promise<string | null> {
  const fromCustom = data.custom_data?.tenant_id;
  if (fromCustom) return fromCustom;

  // Fallback: subscription.updated/canceled bez custom_data
  const existing = await Subscription.findOne({
    paddleSubscriptionId: data.id,
  })
    .select("tenantId")
    .lean<{ tenantId: Types.ObjectId }>();

  return existing?.tenantId ? String(existing.tenantId) : null;
}

/** Pronađi plan preko price ili product ID-a. */
async function resolvePlan(
  priceId: string | null,
  productId: string | null,
): Promise<PlanName | null> {
  if (!priceId && !productId) return null;

  const or: Record<string, string>[] = [];
  if (priceId) {
    or.push({ paddleMonthlyPriceId: priceId }, { paddleYearlyPriceId: priceId });
  }
  if (productId) {
    or.push({ paddleProductId: productId });
  }

  const plan = await Plan.findOne({ $or: or })
    .select("slug")
    .lean<{ slug: PlanName }>();

  return plan?.slug ?? null;
}

// ─── Webhook handler ─────────────────────────────────────────────────────────

export async function handlePaddleWebhook(
  event: PaddleSubscriptionEvent,
): Promise<void> {
  // Ignoriši non-subscription evente (transaction.*, customer.* itd.)
  if (!event.event_type?.startsWith("subscription.")) return;

  await connectToDB();

  const { event_type, data } = event;

  const tenantId = await resolveTenantId(data);
  if (!tenantId) {
    console.warn(
      `[PADDLE] Ne mogu da odredim tenant za subscription ${data.id} (${event_type})`,
    );
    return;
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    console.warn(`[PADDLE] Tenant nije pronađen: ${tenantId}`);
    return;
  }

  const item = data.items?.[0];
  const priceId = item?.price?.id ?? null;
  const productId = item?.price?.product_id ?? item?.product?.id ?? null;

  const status = mapPaddleStatus(data.status);
  const periodStart = data.current_billing_period?.starts_at
    ? new Date(data.current_billing_period.starts_at)
    : new Date();
  const periodEnd = data.current_billing_period?.ends_at
    ? new Date(data.current_billing_period.ends_at)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const cancelAtPeriodEnd = data.scheduled_change?.action === "cancel";

  switch (event_type) {
    case "subscription.created":
    case "subscription.activated":
    case "subscription.updated":
    case "subscription.trialing":
    case "subscription.past_due":
    case "subscription.paused":
    case "subscription.resumed": {
      const resolvedPlan = (await resolvePlan(priceId, productId)) ?? "maria";

      // Politika pristupa: active/trialing/past_due zadržavaju pristup
      // (past_due = grace period dok Paddle ponavlja naplatu),
      // paused privremeno suspenduje tenant.
      const hasAccess =
        status === "active" || status === "trialing" || status === "past_due";

      // 1. Ažuriraj Tenant (backward compat)
      await Tenant.findByIdAndUpdate(tenantId, {
        paid: hasAccess,
        plan: resolvedPlan,
        status: hasAccess ? "active" : "suspended",
        planExpiresAt: periodEnd,
        isTrialActive: status === "trialing",
      });

      // 2. Sinkronizuj Subscription (source of truth)
      await syncSubscriptionFromPaddle({
        tenantId,
        plan: resolvedPlan,
        status,
        paddleSubscriptionId: data.id,
        paddleCustomerId: data.customer_id ?? null,
        paddleProductId: productId,
        paddlePriceId: priceId,
        periodStart,
        periodEnd,
        cancelAtPeriodEnd,
      });
      break;
    }

    case "subscription.canceled": {
      const effectiveEnd = data.canceled_at
        ? new Date(data.canceled_at)
        : periodEnd;
      const previousPlan = (tenant.plan ?? "maria") as PlanName;

      // Otkazana pretplata vraća tenant na besplatni Maria plan — bez ovoga
      // bi zaostali plan i dalje otključavao plaćene funkcionalnosti.
      await Tenant.findByIdAndUpdate(tenantId, {
        paid: false,
        plan: "maria",
        status: "cancelled",
        planExpiresAt: effectiveEnd,
        isTrialActive: false,
      });

      await cancelSubscriptionFromPaddle({
        tenantId,
        periodEnd: effectiveEnd,
      });

      // Obavesti vlasnika (in-app + email) — best effort, ne ruši webhook.
      if (previousPlan !== "maria") {
        await notifySubscriptionCancelled({
          tenantId,
          tenantName: tenant.name ?? "Vaš salon",
          ownerId: tenant.ownerId,
          previousPlan,
          effectiveEnd,
        }).catch((e) =>
          console.error("[PADDLE] notifikacija o otkazivanju nije poslata:", e),
        );
      }
      break;
    }

    default:
      // ostali subscription.* eventi se trenutno ne obrađuju
      break;
  }
}
