import {
  computeAvailability,
  type AvailabilityQuery,
  type AvailabilitySlot,
  type Occupancy,
} from "@panta/booking-engine";
import type { ClientSession } from "mongoose";
import type {
  BookingAvailabilityProvider,
  BookingOverrideAudit,
  BookingOverrideRequest,
} from "./contracts";
import { BookingError } from "./errors";
import type { ValidatedInterval } from "./timeContract";
import { BookingReservation } from "@/models/BookingReservation";

const BLOCKING_STATUSES = ["pending", "confirmed"] as const;

function requestedSlot(
  query: AvailabilityQuery,
  interval: ValidatedInterval,
): AvailabilitySlot | undefined {
  return computeAvailability(query).slots.find(
    (slot) =>
      slot.startsAt.getTime() === interval.startsAt.getTime() &&
      slot.endsAt.getTime() === interval.endsAt.getTime(),
  );
}

function overrideQuery(
  query: AvailabilityQuery,
  interval: ValidatedInterval,
  override: BookingOverrideRequest,
): AvailabilityQuery {
  const bypass = new Set(override.bypassedChecks);
  return {
    ...query,
    ...(bypass.has("schedule") || bypass.has("published_slot")
      ? {
          manualSlots: [
            { time: interval.localStart, durationMinutes: interval.durationMinutes },
          ],
        }
      : {}),
    ...(bypass.has("vacation") ? { vacations: [] } : {}),
  };
}

function validateOverride(override: BookingOverrideRequest | undefined): void {
  if (!override) return;
  if (!override.reason.trim() || override.bypassedChecks.length === 0) {
    throw new BookingError(
      "BOOKING_PERMISSION_DENIED",
      "Booking override zahteva razlog i eksplicitne provere",
    );
  }
}

export async function validateWriteAvailability(input: {
  provider: BookingAvailabilityProvider;
  tenantId: string;
  resourceKey: string;
  interval: ValidatedInterval;
  session: ClientSession;
  excludeReservationId?: string;
  override?: BookingOverrideRequest;
}): Promise<{
  availabilityClass: AvailabilitySlot["availabilityClass"];
  outsidePreferredHours: boolean;
  overrideAudit?: BookingOverrideAudit;
}> {
  validateOverride(input.override);
  const canonical = await BookingReservation.find({
    tenantId: input.tenantId,
    resourceKey: input.resourceKey,
    localDate: input.interval.localDate,
    status: { $in: BLOCKING_STATUSES },
    ...(input.excludeReservationId ? { _id: { $ne: input.excludeReservationId } } : {}),
  })
    .session(input.session)
    .select("startsAt endsAt")
    .lean<Array<{ startsAt: Date; endsAt: Date }>>();
  const canonicalOccupancies: Occupancy[] = canonical.map((item) => ({
    startsAt: item.startsAt,
    endsAt: item.endsAt,
  }));
  const context = await input.provider.load({
    tenantId: input.tenantId,
    resourceKey: input.resourceKey,
    localDate: input.interval.localDate,
    durationMinutes: input.interval.durationMinutes,
    session: input.session,
  });
  const query: AvailabilityQuery = {
    ...context.query,
    occupancies: [
      ...(context.query.occupancies ?? []),
      ...canonicalOccupancies,
    ],
  };
  const normal = requestedSlot(query, input.interval);
  if (normal) {
    return {
      availabilityClass: normal.availabilityClass,
      outsidePreferredHours: normal.outsidePreferredHours,
    };
  }

  if (!input.override) {
    throw new BookingError(
      "BOOKING_SLOT_NOT_AVAILABLE",
      "Traženi termin više nije dostupan",
    );
  }
  const overridden = requestedSlot(
    overrideQuery(query, input.interval, input.override),
    input.interval,
  );
  if (!overridden) {
    throw new BookingError(
      "BOOKING_SLOT_NOT_AVAILABLE",
      "Override ne može zaobići occupancy konflikt",
    );
  }
  return {
    availabilityClass: overridden.availabilityClass,
    outsidePreferredHours: overridden.outsidePreferredHours,
    overrideAudit: {
      actor: input.override.actor,
      reason: input.override.reason.trim(),
      timestamp: input.override.requestedAt.toISOString(),
      bypassedChecks: [...new Set(input.override.bypassedChecks)].sort(),
      pre: { available: false },
      post: { available: true },
    },
  };
}
