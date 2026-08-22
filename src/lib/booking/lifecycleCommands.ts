import type {
  BookingCommandResult,
  BookingCoreDependencies,
  BookingLifecycleFacts,
  BookingOperationType,
  CancelCommand,
  CompleteCommand,
  MarkNoShowCommand,
  RejectCommand,
} from "./contracts";
import { BookingError } from "./errors";
import { commandFingerprint } from "./fingerprint";
import { buildBookingFacts } from "./facts";
import { executeIdempotently } from "./idempotency";
import { lifecycleTarget } from "./lifecycle";
import { touchBookingLocks } from "./locks";
import {
  persistReceiptAndOutbox,
  replayReceipt,
  reservationDTO,
  type ReservationRecord,
} from "./persistence";
import { runBookingTransaction } from "./transaction";
import { BookingReservation } from "@/models/BookingReservation";

type LifecycleOperation = "cancel" | "reject" | "complete" | "mark_no_show";
type AnyLifecycleCommand = CancelCommand | RejectCommand | CompleteCommand | MarkNoShowCommand;

function lifecycleFacts(
  operation: LifecycleOperation,
  occurredAt: Date,
  late: boolean,
): BookingLifecycleFacts {
  const at = occurredAt.toISOString();
  switch (operation) {
    case "cancel":
      return { type: "cancelled", at, late };
    case "reject":
      return { type: "rejected", at };
    case "complete":
      return { type: "completed", at };
    case "mark_no_show":
      return { type: "no_show", at };
  }
}

function operationFingerprint(
  operation: LifecycleOperation,
  command: AnyLifecycleCommand,
): string {
  return commandFingerprint({
    operation,
    tenantId: command.tenantId,
    reservationId: command.reservationId,
    actor: command.actor,
    occurredAt: command.occurredAt,
    ...(operation === "cancel" ? { late: (command as CancelCommand).late } : {}),
  });
}

async function lifecycleCommand(
  operation: LifecycleOperation,
  command: AnyLifecycleCommand,
  dependencies: BookingCoreDependencies,
): Promise<BookingCommandResult> {
  const fingerprint = operationFingerprint(operation, command);
  const late = operation === "cancel" ? (command as CancelCommand).late : false;
  return executeIdempotently({
    tenantId: command.tenantId,
    operationType: operation as BookingOperationType,
    idempotencyKey: command.idempotencyKey,
    fingerprint,
    execute: async () => {
      const initial = await BookingReservation.findOne({
        _id: command.reservationId,
        tenantId: command.tenantId,
      }).lean<ReservationRecord>();
      if (!initial) {
        throw new BookingError("BOOKING_RESERVATION_NOT_FOUND", "Rezervacija nije pronađena");
      }
      return runBookingTransaction(async (session) => {
        const retryReplay = await replayReceipt({
          tenantId: command.tenantId,
          operationType: operation,
          idempotencyKey: command.idempotencyKey,
          fingerprint,
        });
        if (retryReplay) return retryReplay;
        await touchBookingLocks(
          [
            {
              tenantId: command.tenantId,
              resourceKey: initial.resourceKey,
              localDate: initial.localDate,
            },
          ],
          session,
        );
        const current = await BookingReservation.findOne({
          _id: command.reservationId,
          tenantId: command.tenantId,
        })
          .session(session)
          .lean<ReservationRecord>();
        if (!current) {
          throw new BookingError("BOOKING_RESERVATION_NOT_FOUND", "Rezervacija nije pronađena");
        }
        if (
          current.resourceKey !== initial.resourceKey ||
          current.localDate !== initial.localDate ||
          current.lifecycleVersion !== initial.lifecycleVersion
        ) {
          throw new BookingError("BOOKING_CONFLICT", "Rezervacija je u međuvremenu promenjena");
        }
        const status = lifecycleTarget({
          operation,
          status: current.status,
          startsAt: current.startsAt,
          endsAt: current.endsAt,
          occurredAt: command.occurredAt,
          late,
        });
        const lifecycleVersion = current.lifecycleVersion + 1;
        const facts = buildBookingFacts({
          reservationId: command.reservationId,
          tenantId: command.tenantId,
          clientRef: current.clientRef,
          resourceKey: current.resourceKey,
          productType: current.productType,
          productRef: current.productRef,
          startsAt: current.startsAt,
          endsAt: current.endsAt,
          availabilityClass: current.bookingFacts.availabilityClass,
          outsidePreferredHours: current.bookingFacts.outsidePreferredHours,
          overrideAudit: current.overrideAudit,
          lifecycle: lifecycleFacts(operation, command.occurredAt, late),
          lifecycleVersion,
        });
        const updated = await BookingReservation.findOneAndUpdate(
          {
            _id: command.reservationId,
            tenantId: command.tenantId,
            lifecycleVersion: current.lifecycleVersion,
          },
          {
            $set: {
              status,
              bookingFacts: facts,
              ...(operation === "cancel" && late
                ? { lateCancellationAt: command.occurredAt }
                : {}),
            },
            $inc: { lifecycleVersion: 1 },
          },
          { session, new: true },
        ).lean<ReservationRecord>();
        if (!updated) throw new BookingError("BOOKING_CONFLICT", "Lifecycle conflict");
        await dependencies.domain.applyLifecycle({
          session,
          reservationId: command.reservationId,
          operation,
          occurredAt: command.occurredAt,
          late,
        });
        const result: BookingCommandResult = {
          reservation: reservationDTO(updated),
          eventId: facts.eventId,
          replayed: false,
        };
        await persistReceiptAndOutbox({
          tenantId: command.tenantId,
          operationType: operation,
          idempotencyKey: command.idempotencyKey,
          fingerprint,
          result,
          facts,
          occurredAt: command.occurredAt,
          session,
        });
        return result;
      });
    },
  });
}

export function cancel(
  command: CancelCommand,
  dependencies: BookingCoreDependencies,
): Promise<BookingCommandResult> {
  return lifecycleCommand("cancel", command, dependencies);
}

export function reject(
  command: RejectCommand,
  dependencies: BookingCoreDependencies,
): Promise<BookingCommandResult> {
  return lifecycleCommand("reject", command, dependencies);
}

export function complete(
  command: CompleteCommand,
  dependencies: BookingCoreDependencies,
): Promise<BookingCommandResult> {
  return lifecycleCommand("complete", command, dependencies);
}

export function markNoShow(
  command: MarkNoShowCommand,
  dependencies: BookingCoreDependencies,
): Promise<BookingCommandResult> {
  return lifecycleCommand("mark_no_show", command, dependencies);
}
