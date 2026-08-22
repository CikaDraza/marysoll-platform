import type { ClientSession } from "mongoose";
import type { AvailabilityQuery } from "@panta/booking-engine";

export const RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "released",
  "completed",
  "no_show",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
export type BookingProductType = "service" | "consultation" | "education_session";
export type BookingSource =
  | "admin"
  | "authenticated_client"
  | "public_guest"
  | "marketplace"
  | "system";
export type BookingOperationType =
  | "reserve"
  | "reschedule"
  | "cancel"
  | "reject"
  | "complete"
  | "mark_no_show";
export type BookingAvailabilityClass = "standard" | "extended" | "exceptional";

export interface BookingActorRef {
  type: "owner" | "admin" | "staff" | "client" | "guest" | "system";
  id: string;
}

export interface BookingProductSnapshot {
  name: string;
  durationMinutes: number;
  selection?: ReadonlyArray<{
    ref: string;
    name: string;
    quantity: number;
    durationMinutes: number;
  }>;
  revision?: string;
}

export interface ServerResolvedQuoteSnapshot {
  currency: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  source: string;
}

export type BookingOverrideCheck =
  | "published_slot"
  | "schedule"
  | "vacation"
  | "preferred_hours";

export interface BookingOverrideRequest {
  actor: BookingActorRef;
  reason: string;
  bypassedChecks: BookingOverrideCheck[];
  requestedAt: Date;
}

export interface BookingOverrideAudit {
  actor: BookingActorRef;
  reason: string;
  timestamp: string;
  bypassedChecks: BookingOverrideCheck[];
  pre: { available: boolean };
  post: { available: boolean };
}

export type BookingLifecycleFacts =
  | { type: "created" }
  | { type: "rescheduled"; previousStartsAt: string; previousEndsAt: string }
  | { type: "cancelled"; at: string; late: boolean }
  | { type: "rejected"; at: string }
  | { type: "completed"; at: string }
  | { type: "no_show"; at: string };

export interface BookingFacts {
  eventId: string;
  reservationId: string;
  tenantId: string;
  clientRef: string;
  resourceKey: string;
  product: { type: BookingProductType; ref: string };
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  availabilityClass: BookingAvailabilityClass;
  outsidePreferredHours: boolean;
  override?: { applied: true; reason: string; actorId: string };
  lifecycle: BookingLifecycleFacts;
  lifecycleVersion: number;
}

export interface BookingDomainRef {
  type: string;
  id: string;
}

export interface BookingReservationDTO {
  reservationId: string;
  tenantId: string;
  resourceKey: string;
  productType: BookingProductType;
  productRef: string;
  clientRef: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  localDate: string;
  status: ReservationStatus;
  source: BookingSource;
  domainRef: BookingDomainRef;
  productSnapshot: BookingProductSnapshot;
  quoteSnapshot?: ServerResolvedQuoteSnapshot;
  bookingFacts: BookingFacts;
  overrideAudit?: BookingOverrideAudit;
  lateCancellationAt?: string;
  lifecycleVersion: number;
  createdBy: BookingActorRef;
}

interface IdempotentCommand {
  tenantId: string;
  idempotencyKey: string;
}

export interface ReserveCommand extends IdempotentCommand {
  reservationId?: string;
  resourceKey: string;
  productType: BookingProductType;
  productRef: string;
  productSnapshot: BookingProductSnapshot;
  quoteSnapshot?: ServerResolvedQuoteSnapshot;
  clientRef: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  source: BookingSource;
  actor: BookingActorRef;
  domainRef: BookingDomainRef;
  override?: BookingOverrideRequest;
}

export interface RescheduleCommand extends IdempotentCommand {
  reservationId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  actor: BookingActorRef;
  override?: BookingOverrideRequest;
}

export interface LifecycleCommand extends IdempotentCommand {
  reservationId: string;
  actor: BookingActorRef;
  occurredAt: Date;
}

export interface CancelCommand extends LifecycleCommand {
  /** Server-resolved cancellation policy; browser ne odlučuje ovu činjenicu. */
  late: boolean;
}
export type RejectCommand = LifecycleCommand;
export type CompleteCommand = LifecycleCommand;
export type MarkNoShowCommand = LifecycleCommand;

export interface BookingCommandResult {
  reservation: BookingReservationDTO;
  eventId: string;
  replayed: boolean;
}

export interface BookingAvailabilityContext {
  query: AvailabilityQuery;
}

export interface BookingAvailabilityProvider {
  load(input: {
    tenantId: string;
    resourceKey: string;
    localDate: string;
    durationMinutes: number;
    session: ClientSession;
  }): Promise<BookingAvailabilityContext>;
}

export interface BookingDomainTransactionAdapter {
  applyReserve(input: {
    session: ClientSession;
    reservationId: string;
    command: ReserveCommand;
  }): Promise<void>;
  applyReschedule(input: {
    session: ClientSession;
    reservationId: string;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
  }): Promise<void>;
  applyLifecycle(input: {
    session: ClientSession;
    reservationId: string;
    operation: Exclude<BookingOperationType, "reserve" | "reschedule">;
    occurredAt: Date;
    late: boolean;
  }): Promise<void>;
}

export interface BookingCoreDependencies {
  availability: BookingAvailabilityProvider;
  domain: BookingDomainTransactionAdapter;
  now?: () => Date;
}
