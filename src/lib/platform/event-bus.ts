/**
 * Platform Event Bus — adapter ka @panta/event-bus (isti obrazac kao ostali
 * platform klijenti). App emituje i sluša evente SAMO kroz `platformBus`.
 *
 * Singleton po procesu (globalThis guard preživljava dev HMR). Sinhron fan-out;
 * durabilnost je na svakom engine-u (Loyalty ima svoj DB queue + cron).
 *
 * Sledeće (Phase 1): Booking objavljuje `appointment_completed`/`client_checkin`,
 * Loyalty subscriber poziva postojeći emitLoyaltyEvent. NE direktne veze.
 */
import { EventBus } from "@panta/event-bus";

export type {
  PlatformEvent,
  PlatformEventType,
  AppointmentCompletedEvent,
  ClientCheckinEvent,
  FirstVisitEvent,
  ReferralCompletedEvent,
  VoucherUsedEvent,
  EventHandler,
} from "@panta/event-bus";

const globalForBus = globalThis as unknown as {
  __pantaEventBus?: EventBus;
};

export const platformBus: EventBus =
  globalForBus.__pantaEventBus ?? new EventBus();

if (process.env.NODE_ENV !== "production") {
  globalForBus.__pantaEventBus = platformBus;
}
