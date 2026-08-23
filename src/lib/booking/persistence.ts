import { Types, type ClientSession } from "mongoose";
import type {
  BookingCommandResult,
  BookingFacts,
  BookingOperationType,
  BookingOverrideAudit,
  BookingProductSnapshot,
  BookingProductType,
  BookingReservationDTO,
  BookingSource,
  ReservationStatus,
  ServerResolvedQuoteSnapshot,
  BookingActorRef,
} from "./contracts";
import { BookingError } from "./errors";
import { BookingOperationReceipt } from "@/models/BookingOperationReceipt";
import { BookingOutboxEvent } from "@/models/BookingOutboxEvent";

export interface ReservationRecord {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  resourceKey: string;
  productType: BookingProductType;
  productRef: string;
  clientRef: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  localDate: string;
  status: ReservationStatus;
  source: BookingSource;
  domainRef: { type: string; id: string };
  productSnapshot: BookingProductSnapshot;
  quoteSnapshot?: ServerResolvedQuoteSnapshot;
  bookingFacts: BookingFacts;
  overrideAudit?: BookingOverrideAudit;
  lateCancellationAt?: Date;
  lifecycleVersion: number;
  createdBy: BookingActorRef;
}

interface ReceiptRecord {
  fingerprint: string;
  result: BookingCommandResult;
}

export function reservationDTO(record: ReservationRecord): BookingReservationDTO {
  return {
    reservationId: record._id.toString(),
    tenantId: record.tenantId.toString(),
    resourceKey: record.resourceKey,
    productType: record.productType,
    productRef: record.productRef,
    clientRef: record.clientRef,
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt.toISOString(),
    timezone: record.timezone,
    localDate: record.localDate,
    status: record.status,
    source: record.source,
    domainRef: record.domainRef,
    productSnapshot: record.productSnapshot,
    ...(record.quoteSnapshot ? { quoteSnapshot: record.quoteSnapshot } : {}),
    bookingFacts: record.bookingFacts,
    ...(record.overrideAudit ? { overrideAudit: record.overrideAudit } : {}),
    ...(record.lateCancellationAt
      ? { lateCancellationAt: record.lateCancellationAt.toISOString() }
      : {}),
    lifecycleVersion: record.lifecycleVersion,
    createdBy: record.createdBy,
  };
}

export async function replayReceipt(input: {
  tenantId: string;
  operationType: BookingOperationType;
  idempotencyKey: string;
  fingerprint: string;
}): Promise<BookingCommandResult | null> {
  const receipt = await BookingOperationReceipt.findOne({
    tenantId: input.tenantId,
    operationType: input.operationType,
    idempotencyKey: input.idempotencyKey,
  }).lean<ReceiptRecord>();
  if (!receipt) return null;
  if (receipt.fingerprint !== input.fingerprint) {
    throw new BookingError(
      "BOOKING_IDEMPOTENCY_CONFLICT",
      "Idempotency ključ je već upotrebljen za drugu komandu",
      "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_COMMAND",
    );
  }
  return { ...receipt.result, replayed: true };
}

export async function persistReceiptAndOutbox(input: {
  tenantId: string;
  operationType: BookingOperationType;
  idempotencyKey: string;
  fingerprint: string;
  result: BookingCommandResult;
  facts: BookingFacts;
  occurredAt: Date;
  session: ClientSession;
}): Promise<void> {
  await BookingOperationReceipt.create(
    [
      {
        tenantId: input.tenantId,
        operationType: input.operationType,
        idempotencyKey: input.idempotencyKey,
        fingerprint: input.fingerprint,
        reservationId: input.result.reservation.reservationId,
        result: input.result,
        lifecycleVersion: input.facts.lifecycleVersion,
        eventId: input.facts.eventId,
      },
    ],
    { session: input.session },
  );
  await BookingOutboxEvent.create(
    [
      {
        eventId: input.facts.eventId,
        eventType: `booking.${input.facts.lifecycle.type}`,
        tenantId: input.tenantId,
        reservationId: input.result.reservation.reservationId,
        lifecycleVersion: input.facts.lifecycleVersion,
        occurredAt: input.occurredAt,
        payload: input.facts,
        deliveryStatus: "pending",
        attempts: 0,
      },
    ],
    { session: input.session },
  );
}
