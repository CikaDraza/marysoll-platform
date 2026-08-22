import type {
  BookingFacts,
  BookingLifecycleFacts,
  BookingOverrideAudit,
  BookingProductType,
} from "./contracts";

export function bookingEventId(
  reservationId: string,
  lifecycleVersion: number,
  lifecycleType: BookingLifecycleFacts["type"],
): string {
  return `booking:${reservationId}:${lifecycleVersion}:${lifecycleType}`;
}

export function buildBookingFacts(input: {
  reservationId: string;
  tenantId: string;
  clientRef: string;
  resourceKey: string;
  productType: BookingProductType;
  productRef: string;
  startsAt: Date;
  endsAt: Date;
  availabilityClass: BookingFacts["availabilityClass"];
  outsidePreferredHours: boolean;
  overrideAudit?: BookingOverrideAudit;
  lifecycle: BookingLifecycleFacts;
  lifecycleVersion: number;
}): BookingFacts {
  const eventId = bookingEventId(
    input.reservationId,
    input.lifecycleVersion,
    input.lifecycle.type,
  );
  return {
    eventId,
    reservationId: input.reservationId,
    tenantId: input.tenantId,
    clientRef: input.clientRef,
    resourceKey: input.resourceKey,
    product: { type: input.productType, ref: input.productRef },
    startsAt: input.startsAt.toISOString(),
    endsAt: input.endsAt.toISOString(),
    durationMinutes: (input.endsAt.getTime() - input.startsAt.getTime()) / 60_000,
    availabilityClass: input.availabilityClass,
    outsidePreferredHours: input.outsidePreferredHours,
    ...(input.overrideAudit
      ? {
          override: {
            applied: true as const,
            reason: input.overrideAudit.reason,
            actorId: input.overrideAudit.actor.id,
          },
        }
      : {}),
    lifecycle: input.lifecycle,
    lifecycleVersion: input.lifecycleVersion,
  };
}
