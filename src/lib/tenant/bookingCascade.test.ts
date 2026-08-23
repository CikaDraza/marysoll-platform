import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SalonProfile } from "@/models/SalonProfile";
import { Slot } from "@/models/Slot";
import { BookingReservation } from "@/models/BookingReservation";
import { BookingDayLock } from "@/models/BookingDayLock";
import { BookingOperationReceipt } from "@/models/BookingOperationReceipt";
import { BookingOutboxEvent } from "@/models/BookingOutboxEvent";
import { deleteTenantBookingData } from "./bookingCascade";

/**
 * Zapisi se ubacuju sirovo (`collection.insertOne`) jer se ovde proverava
 * SCOPE brisanja, ne validacija šeme — `BookingReservation` traži desetak
 * obaveznih polja koja na ovo pitanje ne utiču.
 */
async function seedTenant(tenantId: Types.ObjectId) {
  const salonId = new Types.ObjectId();
  const suffix = tenantId.toString();
  await SalonProfile.collection.insertOne({
    _id: salonId,
    tenantId,
    name: `Salon ${suffix.slice(-4)}`,
    email: "salon@example.com",
  });
  await Slot.collection.insertMany([
    { salonId, startTime: new Date("2026-09-01T09:00:00Z"), endTime: new Date("2026-09-01T09:30:00Z"), status: "maria" },
    { salonId, startTime: new Date("2026-09-01T10:00:00Z"), endTime: new Date("2026-09-01T10:30:00Z"), status: "booked" },
  ]);
  await BookingReservation.collection.insertOne({ tenantId, resourceKey: "salon", localDate: "2026-09-01" });
  await BookingDayLock.collection.insertOne({ tenantId, resourceKey: "salon", localDate: "2026-09-01", version: 1 });
  await BookingOperationReceipt.collection.insertOne({ tenantId, idempotencyKey: `k-${suffix}`, fingerprint: "f1" });
  await BookingOutboxEvent.collection.insertOne({ tenantId, eventId: `e-${suffix}`, eventType: "booking.reserved" });
  return salonId;
}

async function countsFor(tenantId: Types.ObjectId, salonId: Types.ObjectId) {
  const [slots, reservations, dayLocks, receipts, outboxEvents] = await Promise.all([
    Slot.countDocuments({ salonId }),
    BookingReservation.countDocuments({ tenantId }),
    BookingDayLock.countDocuments({ tenantId }),
    BookingOperationReceipt.countDocuments({ tenantId }),
    BookingOutboxEvent.countDocuments({ tenantId }),
  ]);
  return { slots, reservations, dayLocks, receipts, outboxEvents };
}

describe.sequential("deleteTenantBookingData", () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "booking-cascade-test" });
  }, 120_000);

  beforeEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) =>
        collection.deleteMany({}),
      ),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  it("briše occupancy podatke ciljanog tenanta i ne dira drugi tenant", async () => {
    const tenantA = new Types.ObjectId();
    const tenantB = new Types.ObjectId();
    const salonA = await seedTenant(tenantA);
    const salonB = await seedTenant(tenantB);

    const result = await deleteTenantBookingData(tenantA.toString());

    // Slot je nekada bio filtriran po `tenantId` i nije brisao NIŠTA — zato se
    // ovde tvrdi stvaran broj, ne samo da je posle nula.
    expect(result).toEqual({
      slots: 2,
      reservations: 1,
      dayLocks: 1,
      receipts: 1,
      outboxEvents: 1,
    });

    expect(await countsFor(tenantA, salonA)).toEqual({
      slots: 0,
      reservations: 0,
      dayLocks: 0,
      receipts: 0,
      outboxEvents: 0,
    });

    // Tenant scope važi za svih pet grupa, ne samo za Slot.
    expect(await countsFor(tenantB, salonB)).toEqual({
      slots: 2,
      reservations: 1,
      dayLocks: 1,
      receipts: 1,
      outboxEvents: 1,
    });
  });

  it("ne briše tuđe slotove kada tenant nema salon", async () => {
    const tenantA = new Types.ObjectId();
    const tenantB = new Types.ObjectId();
    const salonB = await seedTenant(tenantB);

    const result = await deleteTenantBookingData(tenantA.toString());

    expect(result.slots).toBe(0);
    expect(await Slot.countDocuments({ salonId: salonB })).toBe(2);
  });
});
