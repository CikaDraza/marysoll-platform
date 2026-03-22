import "server-only";

/**
 * Lemon Squeezy integration
 * Handles subscription lifecycle: created, updated, cancelled, expired
 */

import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import type { ITenant } from "@/models/Tenant";

interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: {
      tenant_id?: string;
      tenant_slug?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      status: string;
      customer_id: number;
      variant_name: string;
      ends_at: string | null;
      trial_ends_at: string | null;
    };
  };
}

type PlanSlug = "free" | "starter" | "pro" | "enterprise";

const VARIANT_TO_PLAN: Record<string, PlanSlug> = {
  // Map Lemon Squeezy variant names to plan slugs
  // Fill these in after creating Lemon Squeezy products
  Starter: "starter",
  Pro: "pro",
  Enterprise: "enterprise",
};

export async function handleLemonSqueezyWebhook(
  event: LemonSqueezyWebhookEvent
): Promise<void> {
  await connectToDB();

  const { event_name, custom_data } = event.meta;
  const { attributes } = event.data;

  const tenantId = custom_data?.tenant_id;
  if (!tenantId) {
    console.warn("Lemon Squeezy webhook: no tenant_id in custom_data");
    return;
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    console.warn(`Tenant not found: ${tenantId}`);
    return;
  }

  switch (event_name) {
    case "subscription_created":
    case "subscription_updated": {
      const plan = VARIANT_TO_PLAN[attributes.variant_name] ?? "starter";
      const isPaid = attributes.status === "active" || attributes.status === "trialing";

      await Tenant.findByIdAndUpdate(tenantId, {
        paid: isPaid,
        plan,
        status: isPaid ? "active" : "suspended",
        lemonsqueezySubscriptionId: event.data.id,
        planExpiresAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
        trialEndsAt: attributes.trial_ends_at
          ? new Date(attributes.trial_ends_at)
          : null,
        isTrialActive: attributes.status === "trialing",
      });
      break;
    }

    case "subscription_cancelled":
    case "subscription_expired": {
      await Tenant.findByIdAndUpdate(tenantId, {
        paid: false,
        status: "suspended",
        planExpiresAt: attributes.ends_at ? new Date(attributes.ends_at) : null,
      });
      break;
    }

    case "subscription_resumed": {
      await Tenant.findByIdAndUpdate(tenantId, {
        paid: true,
        status: "active",
      });
      break;
    }
  }
}

export function verifyLemonSqueezySignature(
  payload: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
