/**
 * Platform Event Bus subscriberi — engine-i se OVDE pretplaćuju na evente.
 * Registruje se jednom na boot-u (instrumentation.ts, nodejs runtime).
 * Idempotentno (guard) — bezbedno i ako se pozove više puta.
 *
 * Phase 1: Loyalty sluša `client_checkin` i prevodi ga u svoj durabilni event
 * (emitLoyaltyEvent → DB queue → streak + poeni). NE direktne veze Booking→Loyalty.
 */
import { platformBus } from "./event-bus";
import { emitLoyaltyEvent } from "@/lib/loyalty/events";

let registered = false;

/** YYYY-MM-DD (UTC) — deo dedup ključa: jedan check-in po klijentu dnevno. */
function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function registerPlatformSubscribers(): void {
  if (registered) return;
  registered = true;

  platformBus.subscribe("client_checkin", async (e) => {
    await emitLoyaltyEvent({
      tenantId: e.tenantId,
      type: "client_checkin",
      sourceType: "tenant_user",
      // Dedup: isti klijent + isti dan = jedan event (anti-abuse "skeniraj za poene").
      sourceId: `checkin:${e.clientId}:${dayKey(e.occurredAt)}`,
      subjectTenantUserId: e.clientId,
      payload: { timestamp: e.occurredAt, source: e.source },
    });
  });
}
