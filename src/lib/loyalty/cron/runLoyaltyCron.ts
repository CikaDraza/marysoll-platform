import "server-only";

// ─── Growth Studio: cron orkestracija ─────────────────────────────────────────
// Poziva se iz /api/cron/loyalty na ~15 min. Svaki korak je izolovan —
// pad jednog ne blokira ostale.

import { runAutoComplete } from "./autoComplete";
import { retryUnprocessedEvents } from "../events";
import { expireDueVouchers } from "../vouchers/service";

export interface LoyaltyCronResult {
  autoComplete: { prompted: number; completed: number };
  events: { scanned: number; processed: number };
  expiredVouchers: number;
  errors: string[];
}

export async function runLoyaltyCron(): Promise<LoyaltyCronResult> {
  const result: LoyaltyCronResult = {
    autoComplete: { prompted: 0, completed: 0 },
    events: { scanned: 0, processed: 0 },
    expiredVouchers: 0,
    errors: [],
  };

  try {
    result.autoComplete = await runAutoComplete();
  } catch (err) {
    console.error("[loyalty cron] autoComplete failed:", err);
    result.errors.push(`autoComplete: ${String(err)}`);
  }

  try {
    result.events = await retryUnprocessedEvents();
  } catch (err) {
    console.error("[loyalty cron] event retry failed:", err);
    result.errors.push(`events: ${String(err)}`);
  }

  try {
    result.expiredVouchers = await expireDueVouchers();
  } catch (err) {
    console.error("[loyalty cron] voucher expiry failed:", err);
    result.errors.push(`vouchers: ${String(err)}`);
  }

  return result;
}
