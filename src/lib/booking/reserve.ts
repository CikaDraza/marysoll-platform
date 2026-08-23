import { Types } from "mongoose";
import type {
  BookingCommandResult,
  BookingCoreDependencies,
  ReserveCommand,
} from "./contracts";
import { commandFingerprint } from "./fingerprint";
import { buildBookingFacts } from "./facts";
import { executeIdempotently } from "./idempotency";
import { touchBookingLocks } from "./locks";
import {
  persistReceiptAndOutbox,
  replayReceipt,
  reservationDTO,
  type ReservationRecord,
} from "./persistence";
import { runBookingTransaction } from "./transaction";
import { validateInterval } from "./timeContract";
import { validateWriteAvailability } from "./writeAvailability";
import { BookingReservation } from "@/models/BookingReservation";

function fingerprintInput(command: ReserveCommand): object {
  return {
    tenantId: command.tenantId,
    resourceKey: command.resourceKey,
    productType: command.productType,
    productRef: command.productRef,
    productSnapshot: command.productSnapshot,
    quoteSnapshot: command.quoteSnapshot,
    clientRef: command.clientRef,
    startsAt: command.startsAt,
    endsAt: command.endsAt,
    timezone: command.timezone,
    source: command.source,
    actor: command.actor,
    domainRef: command.domainRef,
    override: command.override,
  };
}

export async function reserve(
  command: ReserveCommand,
  dependencies: BookingCoreDependencies,
): Promise<BookingCommandResult> {
  const interval = validateInterval(
    command.startsAt,
    command.endsAt,
    command.timezone,
    command.productSnapshot.durationMinutes,
  );
  const fingerprint = commandFingerprint(fingerprintInput(command));
  const reservationObjectId = command.reservationId
    ? new Types.ObjectId(command.reservationId)
    : new Types.ObjectId();
  const occurredAt = dependencies.now?.() ?? new Date();

  return executeIdempotently({
    tenantId: command.tenantId,
    operationType: "reserve",
    idempotencyKey: command.idempotencyKey,
    fingerprint,
    execute: () =>
      runBookingTransaction(async (session) => {
        const retryReplay = await replayReceipt({
          tenantId: command.tenantId,
          operationType: "reserve",
          idempotencyKey: command.idempotencyKey,
          fingerprint,
        });
        if (retryReplay) return retryReplay;
        await touchBookingLocks(
          [
            {
              tenantId: command.tenantId,
              resourceKey: command.resourceKey,
              localDate: interval.localDate,
            },
          ],
          session,
        );
        const availability = await validateWriteAvailability({
          provider: dependencies.availability,
          tenantId: command.tenantId,
          resourceKey: command.resourceKey,
          interval,
          session,
          override: command.override,
        });
        const facts = buildBookingFacts({
          reservationId: reservationObjectId.toString(),
          tenantId: command.tenantId,
          clientRef: command.clientRef,
          resourceKey: command.resourceKey,
          productType: command.productType,
          productRef: command.productRef,
          startsAt: command.startsAt,
          endsAt: command.endsAt,
          availabilityClass: availability.availabilityClass,
          outsidePreferredHours: availability.outsidePreferredHours,
          overrideAudit: availability.overrideAudit,
          lifecycle: { type: "created" },
          lifecycleVersion: 1,
        });
        const record: ReservationRecord = {
          _id: reservationObjectId,
          tenantId: new Types.ObjectId(command.tenantId),
          resourceKey: command.resourceKey,
          productType: command.productType,
          productRef: command.productRef,
          clientRef: command.clientRef,
          startsAt: command.startsAt,
          endsAt: command.endsAt,
          timezone: command.timezone,
          localDate: interval.localDate,
          status: "pending",
          source: command.source,
          domainRef: command.domainRef,
          productSnapshot: command.productSnapshot,
          ...(command.quoteSnapshot ? { quoteSnapshot: command.quoteSnapshot } : {}),
          bookingFacts: facts,
          ...(availability.overrideAudit
            ? { overrideAudit: availability.overrideAudit }
            : {}),
          lifecycleVersion: 1,
          createdBy: command.actor,
        };
        await BookingReservation.create(
          [
            {
              ...record,
              creationCommand: {
                idempotencyKey: command.idempotencyKey,
                fingerprint,
              },
            },
          ],
          { session },
        );
        await dependencies.domain.applyReserve({
          session,
          reservationId: reservationObjectId.toString(),
          command,
        });
        const result: BookingCommandResult = {
          reservation: reservationDTO(record),
          eventId: facts.eventId,
          replayed: false,
        };
        await persistReceiptAndOutbox({
          tenantId: command.tenantId,
          operationType: "reserve",
          idempotencyKey: command.idempotencyKey,
          fingerprint,
          result,
          facts,
          occurredAt,
          session,
        });
        return result;
      }),
  });
}
