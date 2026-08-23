import { describe, expect, it } from "vitest";
import { Appointment } from "@/models/Appointment";
import { BookingDayLock } from "@/models/BookingDayLock";
import { BookingOperationReceipt } from "@/models/BookingOperationReceipt";
import { BookingOutboxEvent } from "@/models/BookingOutboxEvent";
import { BookingReservation } from "@/models/BookingReservation";

function namedIndex(
  indexes: ReturnType<typeof BookingReservation.schema.indexes>,
  name: string,
) {
  return indexes.find(([, options]) => options.name === name);
}

describe("Slice 5 booking persistence contract", () => {
  it("keeps Reservation statuses free of legacy rescheduled semantics", () => {
    const values = BookingReservation.schema.path("status").options.enum;
    expect(values).toEqual([
      "pending",
      "confirmed",
      "released",
      "completed",
      "no_show",
    ]);
    expect(values).not.toContain("rescheduled");
  });

  it("has a unique domain cross-reference guard", () => {
    const index = namedIndex(
      BookingReservation.schema.indexes(),
      "booking_reservation_domain_unique",
    );
    expect(index?.[0]).toEqual({
      tenantId: 1,
      "domainRef.type": 1,
      "domainRef.id": 1,
    });
    expect(index?.[1].unique).toBe(true);
  });

  it("serializes each tenant/resource/local day through one unique lock", () => {
    const index = namedIndex(
      BookingDayLock.schema.indexes(),
      "booking_day_lock_unique",
    );
    expect(index?.[0]).toEqual({ tenantId: 1, resourceKey: 1, localDate: 1 });
    expect(index?.[1].unique).toBe(true);
  });

  it("scopes durable receipts to operation and idempotency key", () => {
    const index = namedIndex(
      BookingOperationReceipt.schema.indexes(),
      "booking_operation_receipt_unique",
    );
    expect(index?.[0]).toEqual({ tenantId: 1, operationType: 1, idempotencyKey: 1 });
    expect(index?.[1].unique).toBe(true);
    expect(BookingOperationReceipt.schema.options.expireAfterSeconds).toBeUndefined();
  });

  it("has a stable unique outbox event without TTL", () => {
    const index = namedIndex(
      BookingOutboxEvent.schema.indexes(),
      "booking_outbox_event_unique",
    );
    expect(index?.[1].unique).toBe(true);
    expect(
      BookingOutboxEvent.schema.indexes().some(([, options]) => "expireAfterSeconds" in options),
    ).toBe(false);
  });

  it("adds only an optional sparse unique Appointment cross-reference", () => {
    expect(Appointment.schema.path("bookingReservationId").options.required).not.toBe(true);
    const index = namedIndex(
      Appointment.schema.indexes(),
      "appointment_booking_reservation_unique",
    );
    expect(index?.[1]).toMatchObject({ unique: true, sparse: true });
  });
});
