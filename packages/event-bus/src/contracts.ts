/**
 * Platform event kontrakti — zajednički jezik između engine-a (T8).
 *
 * Prvih 5 evenata (namerno mali skup — ne generički bus prerano). ID-jevi su
 * `string` (DB _id kao string) da paket ostane bez DB/mongoose zavisnosti.
 * Svaki event nosi `tenantId` (multi-tenant granica) + `occurredAt` (ISO).
 *
 * Emiteri (npr. Booking) objave event; subscriber-i (Loyalty, Marketing,
 * Analytics, Notification, AI) reaguju. NE direktne veze Booking→Loyalty.
 */

export interface EventEnvelope {
  /** Tenant (salon) DB _id kao string — svaki event pripada jednom tenantu. */
  tenantId: string;
  /** ISO timestamp nastanka. */
  occurredAt: string;
}

/** Termin završen (postojeći loyalty flow već koristi ovaj domen). */
export interface AppointmentCompletedEvent extends EventEnvelope {
  type: "appointment_completed";
  appointmentId: string;
  /** Subjekt = klijent (tenant user) na kog se event odnosi. */
  clientId: string;
  spend?: number;
  serviceName?: string;
}

/** Klijent skenirao QR u salonu (Phase 1 loyalty). */
export interface ClientCheckinEvent extends EventEnvelope {
  type: "client_checkin";
  clientId: string;
  source: "qr" | "manual" | "link";
}

/** Prva završena poseta klijenta (multi-consumer: welcome/onboarding/conversion). */
export interface FirstVisitEvent extends EventEnvelope {
  type: "first_visit";
  clientId: string;
  appointmentId?: string;
}

/** Referral zatvoren (nova osoba register+book+complete — anti-abuse). */
export interface ReferralCompletedEvent extends EventEnvelope {
  type: "referral_completed";
  referrerClientId: string;
  referredClientId: string;
  referralId?: string;
}

/** Vaučer iskorišćen na terminu (redemption). */
export interface VoucherUsedEvent extends EventEnvelope {
  type: "voucher_used";
  voucherId: string;
  code: string;
  clientId: string;
  appointmentId?: string;
  discountAmount?: number;
}

export type PlatformEvent =
  | AppointmentCompletedEvent
  | ClientCheckinEvent
  | FirstVisitEvent
  | ReferralCompletedEvent
  | VoucherUsedEvent;

export type PlatformEventType = PlatformEvent["type"];

/** Suzi uniju na konkretan event po `type` (za tipizovan subscribe/handler). */
export type EventByType<T extends PlatformEventType> = Extract<
  PlatformEvent,
  { type: T }
>;
