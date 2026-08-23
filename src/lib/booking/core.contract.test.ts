import { describe, expect, it } from "vitest";
import { commandFingerprint } from "./fingerprint";
import { bookingEventId, buildBookingFacts } from "./facts";
import { lifecycleTarget } from "./lifecycle";
import { sortBookingLocks } from "./locks";
import { validateInterval } from "./timeContract";
import { BookingError } from "./errors";

describe("Booking CORE pure contracts", () => {
  it("canonicalizes object key order before SHA-256 fingerprinting", () => {
    expect(commandFingerprint({ tenantId: "a", nested: { z: 2, a: 1 } })).toBe(
      commandFingerprint({ nested: { a: 1, z: 2 }, tenantId: "a" }),
    );
  });

  it("changes fingerprint for a meaningful trusted command change", () => {
    expect(commandFingerprint({ resource: "salon", duration: 60 })).not.toBe(
      commandFingerprint({ resource: "salon", duration: 90 }),
    );
  });

  it("canonicalizes Date values as stable UTC instants", () => {
    expect(commandFingerprint({ at: new Date("2026-09-01T08:00:00Z") })).toBe(
      commandFingerprint({ at: "2026-09-01T08:00:00.000Z" }),
    );
  });

  it("derives localDate server-side from instant and IANA timezone", () => {
    const interval = validateInterval(
      new Date("2026-09-01T22:30:00Z"),
      new Date("2026-09-01T23:00:00Z"),
      "Europe/Belgrade",
      30,
    );
    expect(interval.localDate).toBe("2026-09-02");
    expect(interval.localStart).toBe("00:30");
  });

  it("rejects invalid and cross-midnight intervals", () => {
    expect(() =>
      validateInterval(
        new Date("2026-09-01T21:30:00Z"),
        new Date("2026-09-01T22:30:00Z"),
        "Europe/Belgrade",
      ),
    ).toThrowError(BookingError);
    expect(() =>
      validateInterval(
        new Date("2026-09-01T08:00:00Z"),
        new Date("2026-09-01T08:00:00Z"),
        "Europe/Belgrade",
      ),
    ).toThrowError(BookingError);
  });

  it("sorts and de-duplicates old/new day locks deterministically", () => {
    const tenantId = "64b000000000000000000001";
    expect(
      sortBookingLocks([
        { tenantId, resourceKey: "salon", localDate: "2026-09-03" },
        { tenantId, resourceKey: "room:2", localDate: "2026-09-01" },
        { tenantId, resourceKey: "salon", localDate: "2026-09-01" },
        { tenantId, resourceKey: "salon", localDate: "2026-09-03" },
      ]),
    ).toEqual([
      { tenantId, resourceKey: "room:2", localDate: "2026-09-01" },
      { tenantId, resourceKey: "salon", localDate: "2026-09-01" },
      { tenantId, resourceKey: "salon", localDate: "2026-09-03" },
    ]);
  });

  it("enforces lifecycle terminal timing and release rules", () => {
    const startsAt = new Date("2026-09-01T08:00:00Z");
    const endsAt = new Date("2026-09-01T09:00:00Z");
    expect(
      lifecycleTarget({
        operation: "cancel",
        status: "confirmed",
        startsAt,
        endsAt,
        occurredAt: startsAt,
        late: false,
      }),
    ).toBe("released");
    expect(
      lifecycleTarget({
        operation: "cancel",
        status: "confirmed",
        startsAt,
        endsAt,
        occurredAt: startsAt,
        late: true,
      }),
    ).toBe("confirmed");
    expect(() =>
      lifecycleTarget({
        operation: "complete",
        status: "confirmed",
        startsAt,
        endsAt,
        occurredAt: new Date("2026-09-01T08:59:59Z"),
        late: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "BOOKING_INVALID_STATE" }));
    expect(
      lifecycleTarget({
        operation: "mark_no_show",
        status: "confirmed",
        startsAt,
        endsAt,
        occurredAt: endsAt,
        late: false,
      }),
    ).toBe("no_show");
  });

  it("builds stable, calculation-free BookingFacts for lifecycle events", () => {
    const facts = buildBookingFacts({
      reservationId: "r1",
      tenantId: "t1",
      clientRef: "c1",
      resourceKey: "salon",
      productType: "service",
      productRef: "s1",
      startsAt: new Date("2026-09-01T08:00:00Z"),
      endsAt: new Date("2026-09-01T09:00:00Z"),
      availabilityClass: "standard",
      outsidePreferredHours: false,
      lifecycle: { type: "created" },
      lifecycleVersion: 1,
    });
    expect(facts.eventId).toBe(bookingEventId("r1", 1, "created"));
    expect(facts.durationMinutes).toBe(60);
    expect(facts.lifecycle).toEqual({ type: "created" });
    expect(facts).not.toHaveProperty("price");
    expect(facts).not.toHaveProperty("loyalty");
  });
});
