import type {
  BookingCommandResult,
  BookingCoreDependencies,
  RescheduleCommand,
} from "./contracts";
import { BookingError } from "./errors";
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

type AvailabilityDecision = Awaited<ReturnType<typeof validateWriteAvailability>>;

function fingerprintInput(command: RescheduleCommand): object {
  return {
    tenantId: command.tenantId,
    reservationId: command.reservationId,
    startsAt: command.startsAt,
    endsAt: command.endsAt,
    timezone: command.timezone,
    actor: command.actor,
    override: command.override,
  };
}

async function scopedReservation(
  tenantId: string,
  reservationId: string,
): Promise<ReservationRecord> {
  const record = await BookingReservation.findOne({ _id: reservationId, tenantId })
    .lean<ReservationRecord>();
  if (!record) {
    throw new BookingError("BOOKING_RESERVATION_NOT_FOUND", "Rezervacija nije pronađena");
  }
  return record;
}

function assertUnchangedReservation(
  current: ReservationRecord | null,
  initial: ReservationRecord,
): asserts current is ReservationRecord {
  if (!current) {
    throw new BookingError("BOOKING_RESERVATION_NOT_FOUND", "Rezervacija nije pronađena");
  }
  const moved =
    current.localDate !== initial.localDate ||
    current.resourceKey !== initial.resourceKey ||
    current.lifecycleVersion !== initial.lifecycleVersion;
  if (moved) {
    throw new BookingError("BOOKING_CONFLICT", "Rezervacija je u međuvremenu promenjena");
  }
  if (current.status !== "pending" && current.status !== "confirmed") {
    throw new BookingError("BOOKING_INVALID_STATE", "Rezervacija nije aktivna");
  }
}

function reservationUpdate(input: {
  command: RescheduleCommand;
  localDate: string;
  facts: ReturnType<typeof buildBookingFacts>;
  availability: AvailabilityDecision;
}): object {
  return {
    startsAt: input.command.startsAt,
    endsAt: input.command.endsAt,
    timezone: input.command.timezone,
    localDate: input.localDate,
    bookingFacts: input.facts,
    ...(input.availability.overrideAudit
      ? { overrideAudit: input.availability.overrideAudit }
      : {}),
  };
}

export async function reschedule(
  command: RescheduleCommand,
  dependencies: BookingCoreDependencies,
): Promise<BookingCommandResult> {
  const interval = validateInterval(command.startsAt, command.endsAt, command.timezone);
  const fingerprint = commandFingerprint(fingerprintInput(command));
  const occurredAt = dependencies.now?.() ?? new Date();

  return executeIdempotently({
    tenantId: command.tenantId,
    operationType: "reschedule",
    idempotencyKey: command.idempotencyKey,
    fingerprint,
    execute: async () => {
      const initial = await scopedReservation(command.tenantId, command.reservationId);
      return runBookingTransaction(async (session) => {
        const retryReplay = await replayReceipt({
          tenantId: command.tenantId,
          operationType: "reschedule",
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
            {
              tenantId: command.tenantId,
              resourceKey: initial.resourceKey,
              localDate: interval.localDate,
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
        assertUnchangedReservation(current, initial);
        const availability = await validateWriteAvailability({
          provider: dependencies.availability,
          tenantId: command.tenantId,
          resourceKey: current.resourceKey,
          interval,
          session,
          excludeReservationId: command.reservationId,
          override: command.override,
        });
        const lifecycleVersion = current.lifecycleVersion + 1;
        const facts = buildBookingFacts({
          reservationId: command.reservationId,
          tenantId: command.tenantId,
          clientRef: current.clientRef,
          resourceKey: current.resourceKey,
          productType: current.productType,
          productRef: current.productRef,
          startsAt: command.startsAt,
          endsAt: command.endsAt,
          availabilityClass: availability.availabilityClass,
          outsidePreferredHours: availability.outsidePreferredHours,
          overrideAudit: availability.overrideAudit,
          lifecycle: {
            type: "rescheduled",
            previousStartsAt: current.startsAt.toISOString(),
            previousEndsAt: current.endsAt.toISOString(),
          },
          lifecycleVersion,
        });
        const updated = await BookingReservation.findOneAndUpdate(
          {
            _id: command.reservationId,
            tenantId: command.tenantId,
            lifecycleVersion: current.lifecycleVersion,
          },
          {
            $set: reservationUpdate({
              command,
              localDate: interval.localDate,
              facts,
              availability,
            }),
            $inc: { lifecycleVersion: 1 },
          },
          { session, new: true },
        ).lean<ReservationRecord>();
        if (!updated) throw new BookingError("BOOKING_CONFLICT", "Reschedule conflict");
        await dependencies.domain.applyReschedule({
          session,
          reservationId: command.reservationId,
          startsAt: command.startsAt,
          endsAt: command.endsAt,
          timezone: command.timezone,
        });
        const result: BookingCommandResult = {
          reservation: reservationDTO(updated),
          eventId: facts.eventId,
          replayed: false,
        };
        await persistReceiptAndOutbox({
          tenantId: command.tenantId,
          operationType: "reschedule",
          idempotencyKey: command.idempotencyKey,
          fingerprint,
          result,
          facts,
          occurredAt,
          session,
        });
        return result;
      });
    },
  });
}
