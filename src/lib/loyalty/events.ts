import "server-only";

// ─── Growth Studio: event dispatch ────────────────────────────────────────────
// Bez pub/sub-a na Vercelu: event se PRVO upiše (dedup preko unique
// {tenantId, type, sourceId}), pa obradi sinhrono. Greška u obradi nikad ne
// stiže do caller-a (loyalty ne sme da sruši booking) — event ostaje
// pending/failed i cron sweeper ga retry-uje.

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { tenantHasFeature } from "@/lib/plans/subscriptionService";
import { getLoyaltyConfig } from "./config";
import { applyRulesForEvent } from "./engine";
import type {
  LoyaltyConfigLean,
  LoyaltyEventLean,
  LoyaltyEventType,
} from "./types";

/** Da li je loyalty aktivan za tenant (plan dozvoljava + salon uključio). */
export async function isLoyaltyActive(
  tenantId: Types.ObjectId | string,
): Promise<{ active: boolean; config: LoyaltyConfigLean | null }> {
  try {
    const config = await getLoyaltyConfig(tenantId);
    if (!config?.enabled) return { active: false, config: null };
    const allowed = await tenantHasFeature(String(tenantId), "loyaltyCore");
    return { active: allowed, config: allowed ? config : null };
  } catch (err) {
    console.error("[loyalty] isLoyaltyActive failed:", err);
    return { active: false, config: null };
  }
}

export interface EmitLoyaltyEventParams {
  tenantId: Types.ObjectId | string;
  type: LoyaltyEventType;
  sourceType: "appointment" | "tenant_user" | "admin";
  sourceId: string;
  subjectTenantUserId: Types.ObjectId | string;
  payload?: Record<string, unknown>;
}

/** Nikad ne baca. Duplikat (isti sourceId) je tihi no-op. */
export async function emitLoyaltyEvent(
  params: EmitLoyaltyEventParams,
): Promise<void> {
  try {
    await connectToDB();
    const { active, config } = await isLoyaltyActive(params.tenantId);
    if (!active || !config) return;

    let event: LoyaltyEventLean;
    try {
      const doc = await LoyaltyEvent.create({
        tenantId: params.tenantId,
        type: params.type,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        subjectTenantUserId: params.subjectTenantUserId,
        payload: params.payload ?? {},
        status: "pending",
      });
      event = doc.toObject() as LoyaltyEventLean;
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) return; // već obrađeno
      throw err;
    }

    await processLoyaltyEvent(event, config);
  } catch (err) {
    console.error("[loyalty] emitLoyaltyEvent failed:", err);
  }
}

/** Obradi jedan event; greška ostavlja event u failed (retry preko crona). */
export async function processLoyaltyEvent(
  event: LoyaltyEventLean,
  config?: LoyaltyConfigLean | null,
): Promise<boolean> {
  await connectToDB();
  const cfg = config ?? (await getLoyaltyConfig(event.tenantId));
  if (!cfg?.enabled) {
    await LoyaltyEvent.findByIdAndUpdate(event._id, {
      $set: { status: "skipped", processedAt: new Date() },
      $inc: { attempts: 1 },
    });
    return false;
  }

  try {
    await applyRulesForEvent(event, cfg);
    await LoyaltyEvent.findByIdAndUpdate(event._id, {
      $set: { status: "processed", processedAt: new Date(), lastError: null },
      $inc: { attempts: 1 },
    });
    return true;
  } catch (err) {
    console.error(`[loyalty] event ${event._id} processing failed:`, err);
    await LoyaltyEvent.findByIdAndUpdate(event._id, {
      $set: { status: "failed", lastError: String(err) },
      $inc: { attempts: 1 },
    });
    return false;
  }
}

/**
 * Cron sweeper: retry pending/failed događaja (safety net za padove usred
 * obrade). Ledger idempotencija čini ponovnu obradu bezbednom.
 */
export async function retryUnprocessedEvents(
  limit = 50,
): Promise<{ scanned: number; processed: number }> {
  await connectToDB();
  const cutoff = new Date(Date.now() - 5 * 60_000);
  const events = (await LoyaltyEvent.find({
    status: { $in: ["pending", "failed"] },
    attempts: { $lt: 5 },
    updatedAt: { $lt: cutoff },
  })
    .limit(limit)
    .lean()) as unknown as LoyaltyEventLean[];

  let processed = 0;
  for (const event of events) {
    const ok = await processLoyaltyEvent(event);
    if (ok) processed++;
  }
  return { scanned: events.length, processed };
}
