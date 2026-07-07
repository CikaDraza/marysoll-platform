/**
 * @panta/event-bus — tipizovani cross-engine kontrakti + tanki in-process bus.
 *
 * T8: prvih 5 kontrakata (appointment_completed · client_checkin · first_visit ·
 * referral_completed · voucher_used). Emiteri objave, subscriber-i (engine-i)
 * reaguju. Bez baze/Next — durabilnost je odgovornost svakog engine-a.
 */
export type {
  EventEnvelope,
  AppointmentCompletedEvent,
  ClientCheckinEvent,
  FirstVisitEvent,
  ReferralCompletedEvent,
  VoucherUsedEvent,
  PlatformEvent,
  PlatformEventType,
  EventByType,
} from "./contracts";

export { EventBus } from "./bus";
export type { EventHandler, BusErrorReporter } from "./bus";
