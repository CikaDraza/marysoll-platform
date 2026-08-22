import mongoose, { Schema, model, models, Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type {
  BookingAvailabilityProvider,
  BookingCoreDependencies,
  BookingDomainTransactionAdapter,
  ReserveCommand,
} from "./contracts";
import { cancel, complete, markNoShow, reject } from "./lifecycleCommands";
import { reserve } from "./reserve";
import { reschedule } from "./reschedule";
import { BookingError } from "./errors";
import { BookingReservation } from "@/models/BookingReservation";
import { BookingDayLock } from "@/models/BookingDayLock";
import { BookingOperationReceipt } from "@/models/BookingOperationReceipt";
import { BookingOutboxEvent } from "@/models/BookingOutboxEvent";
import { Appointment } from "@/models/Appointment";
import { loadUnmigratedAppointmentOccupancy } from "./legacyOccupancy";
import { toOccupancies } from "./availabilityAdapter";
import {
  createServiceAppointmentDomainAdapter,
  resolveServiceBookingProduct,
  serviceAvailabilityProvider,
} from "./serviceAdapter";
import { Service } from "@/models/Service";
import { SalonProfile } from "@/models/SalonProfile";

const testDomainSchema = new Schema(
  {
    reservationId: { type: Schema.Types.ObjectId, required: true, unique: true },
    startsAt: Date,
    endsAt: Date,
    status: String,
  },
  { timestamps: true },
);
const TestBookingDomain =
  models.TestBookingDomain || model("TestBookingDomain", testDomainSchema);

const openAvailability: BookingAvailabilityProvider = {
  async load(input) {
    return {
      query: {
        tenantId: input.tenantId,
        resourceKey: input.resourceKey,
        localDate: input.localDate,
        timezone: "UTC",
        durationMinutes: input.durationMinutes,
        schedule: {
          0: [{ from: "00:00", to: "24:00" }],
          1: [{ from: "00:00", to: "24:00" }],
          2: [{ from: "00:00", to: "24:00" }],
          3: [{ from: "00:00", to: "24:00" }],
          4: [{ from: "00:00", to: "24:00" }],
          5: [{ from: "00:00", to: "24:00" }],
          6: [{ from: "00:00", to: "24:00" }],
        },
        stepMinutes: 30,
      },
    };
  },
};

const legacyAwareAvailability: BookingAvailabilityProvider = {
  async load(input) {
    const appointments = await loadUnmigratedAppointmentOccupancy({
      tenantId: input.tenantId,
      localDate: input.localDate,
      session: input.session,
    });
    const base = await openAvailability.load(input);
    return {
      query: {
        ...base.query,
        occupancies: toOccupancies(appointments, "UTC"),
      },
    };
  },
};

function domainAdapter(options?: { failReserve?: boolean }): BookingDomainTransactionAdapter {
  return {
    async applyReserve({ session, reservationId, command }) {
      if (options?.failReserve) throw new Error("controlled domain failure");
      await TestBookingDomain.create(
        [
          {
            reservationId,
            startsAt: command.startsAt,
            endsAt: command.endsAt,
            status: "pending",
          },
        ],
        { session },
      );
    },
    async applyReschedule({ session, reservationId, startsAt, endsAt }) {
      const result = await TestBookingDomain.updateOne(
        { reservationId },
        { $set: { startsAt, endsAt } },
        { session },
      );
      if (result.matchedCount !== 1) throw new Error("domain reservation missing");
    },
    async applyLifecycle({ session, reservationId, operation, late }) {
      const status = operation === "cancel" && late ? "late_cancel" : operation;
      const result = await TestBookingDomain.updateOne(
        { reservationId },
        { $set: { status } },
        { session },
      );
      if (result.matchedCount !== 1) throw new Error("domain reservation missing");
    },
  };
}

function dependencies(options?: {
  failReserve?: boolean;
  availability?: BookingAvailabilityProvider;
}): BookingCoreDependencies {
  return {
    availability: options?.availability ?? openAvailability,
    domain: domainAdapter(options),
    now: () => new Date("2027-01-01T00:00:00Z"),
  };
}

function reserveCommand(input?: Partial<ReserveCommand>): ReserveCommand {
  const tenantId = input?.tenantId ?? new Types.ObjectId().toString();
  const domainId = input?.domainRef?.id ?? new Types.ObjectId().toString();
  return {
    tenantId,
    idempotencyKey: input?.idempotencyKey ?? crypto.randomUUID(),
    resourceKey: input?.resourceKey ?? "salon",
    productType: "service",
    productRef: new Types.ObjectId().toString(),
    productSnapshot: { name: "Test service", durationMinutes: 60 },
    clientRef: new Types.ObjectId().toString(),
    startsAt: new Date("2027-09-06T10:00:00Z"),
    endsAt: new Date("2027-09-06T11:00:00Z"),
    timezone: "UTC",
    source: "system",
    actor: { type: "system", id: "integration-test" },
    domainRef: { type: "test", id: domainId },
    ...input,
  };
}

async function expectBookingCode(
  promise: Promise<unknown>,
  codes: string[],
): Promise<void> {
  try {
    await promise;
    throw new Error("Expected booking operation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(BookingError);
    expect(codes).toContain((error as BookingError).code);
  }
}

describe.sequential("Booking CORE Mongo replica-set integration", () => {
  let replSet: MongoMemoryReplSet;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(replSet.getUri(), { dbName: "booking-core-test" });
    await Promise.all([
      BookingReservation.syncIndexes(),
      BookingDayLock.syncIndexes(),
      BookingOperationReceipt.syncIndexes(),
      BookingOutboxEvent.syncIndexes(),
      TestBookingDomain.syncIndexes(),
      Appointment.syncIndexes(),
      Service.syncIndexes(),
      SalonProfile.syncIndexes(),
    ]);
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
    await replSet?.stop();
  });

  it("serializes the first-lock race and commits exactly one overlapping reserve", async () => {
    const tenantId = new Types.ObjectId().toString();
    const outcomes = await Promise.allSettled([
      reserve(reserveCommand({ tenantId }), dependencies()),
      reserve(reserveCommand({ tenantId }), dependencies()),
    ]);
    expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    const loser = outcomes.find((item) => item.status === "rejected");
    expect(loser?.status).toBe("rejected");
    expect((loser as PromiseRejectedResult).reason).toBeInstanceOf(BookingError);
    expect(["BOOKING_CONFLICT", "BOOKING_SLOT_NOT_AVAILABLE"]).toContain(
      ((loser as PromiseRejectedResult).reason as BookingError).code,
    );
    expect(await BookingReservation.countDocuments()).toBe(1);
    expect(await BookingDayLock.countDocuments()).toBe(1);
  });

  it("isolates locks by resource and tenant and permits adjacent intervals", async () => {
    const tenantId = new Types.ObjectId().toString();
    await Promise.all([
      reserve(reserveCommand({ tenantId, resourceKey: "salon" }), dependencies()),
      reserve(reserveCommand({ tenantId, resourceKey: "staff:1" }), dependencies()),
      reserve(
        reserveCommand({
          tenantId: new Types.ObjectId().toString(),
          resourceKey: "salon",
        }),
        dependencies(),
      ),
      reserve(
        reserveCommand({
          tenantId,
          resourceKey: "salon",
          startsAt: new Date("2027-09-06T11:00:00Z"),
          endsAt: new Date("2027-09-06T12:00:00Z"),
        }),
        dependencies(),
      ),
    ]);
    expect(await BookingReservation.countDocuments()).toBe(4);
  });

  it("rejects a stale offered slot from committed current state", async () => {
    const tenantId = new Types.ObjectId().toString();
    await reserve(reserveCommand({ tenantId }), dependencies());
    await expectBookingCode(
      reserve(reserveCommand({ tenantId }), dependencies()),
      ["BOOKING_SLOT_NOT_AVAILABLE"],
    );
  });

  it("blocks unmigrated legacy Appointment occupancy", async () => {
    const tenantId = new Types.ObjectId().toString();
    await Appointment.create({
      tenantId,
      clientProfileId: new Types.ObjectId(),
      clientName: "Legacy client",
      clientEmail: "legacy@example.test",
      serviceName: "Legacy service",
      services: [],
      date: "2027-09-06",
      time: "10:00",
      duration: 60,
      status: "appointment_approved",
    });
    await expectBookingCode(
      reserve(
        reserveCommand({ tenantId }),
        dependencies({ availability: legacyAwareAvailability }),
      ),
      ["BOOKING_SLOT_NOT_AVAILABLE"],
    );
  });

  it("does not double-count an Appointment already linked to a Reservation", async () => {
    const tenantId = new Types.ObjectId().toString();
    await Appointment.create({
      tenantId,
      bookingReservationId: new Types.ObjectId(),
      clientProfileId: new Types.ObjectId(),
      clientName: "Linked client",
      clientEmail: "linked@example.test",
      serviceName: "Linked service",
      services: [],
      date: "2027-09-06",
      time: "10:00",
      duration: 60,
      status: "appointment_approved",
    });
    await reserve(
      reserveCommand({ tenantId }),
      dependencies({ availability: legacyAwareAvailability }),
    );
    expect(await BookingReservation.countDocuments()).toBe(1);
  });

  it("replays same idempotency command with one state/domain/receipt/event", async () => {
    const command = reserveCommand();
    const first = await reserve(command, dependencies());
    const replay = await reserve(command, dependencies());
    expect(replay.replayed).toBe(true);
    expect(replay.reservation.reservationId).toBe(first.reservation.reservationId);
    expect(replay.eventId).toBe(first.eventId);
    expect(await BookingReservation.countDocuments()).toBe(1);
    expect(await TestBookingDomain.countDocuments()).toBe(1);
    expect(await BookingOperationReceipt.countDocuments()).toBe(1);
    expect(await BookingOutboxEvent.countDocuments()).toBe(1);
  });

  it("resolves a concurrent same-idempotency race as commit plus replay", async () => {
    const command = reserveCommand();
    const results = await Promise.all([
      reserve(command, dependencies()),
      reserve(command, dependencies()),
    ]);
    expect(results.filter((item) => item.replayed)).toHaveLength(1);
    expect(new Set(results.map((item) => item.eventId))).toHaveLength(1);
    expect(await BookingReservation.countDocuments()).toBe(1);
  });

  it("rejects reuse of an idempotency key with a changed trusted command", async () => {
    const command = reserveCommand();
    await reserve(command, dependencies());
    await expectBookingCode(
      reserve(
        {
          ...command,
          startsAt: new Date("2027-09-06T12:00:00Z"),
          endsAt: new Date("2027-09-06T13:00:00Z"),
        },
        dependencies(),
      ),
      ["BOOKING_IDEMPOTENCY_CONFLICT"],
    );
  });

  it("rolls back reservation, receipt and outbox when the domain hook fails", async () => {
    await expectBookingCode(reserve(reserveCommand(), dependencies({ failReserve: true })), [
      "BOOKING_INFRASTRUCTURE_UNAVAILABLE",
    ]);
    expect(await BookingReservation.countDocuments()).toBe(0);
    expect(await BookingOperationReceipt.countDocuments()).toBe(0);
    expect(await BookingOutboxEvent.countDocuments()).toBe(0);
  });

  it("reschedules atomically and leaves old state intact on target conflict", async () => {
    const tenantId = new Types.ObjectId().toString();
    const first = await reserve(reserveCommand({ tenantId }), dependencies());
    await reserve(
      reserveCommand({
        tenantId,
        startsAt: new Date("2027-09-06T12:00:00Z"),
        endsAt: new Date("2027-09-06T13:00:00Z"),
      }),
      dependencies(),
    );
    await expectBookingCode(
      reschedule(
        {
          tenantId,
          reservationId: first.reservation.reservationId,
          idempotencyKey: crypto.randomUUID(),
          startsAt: new Date("2027-09-06T12:00:00Z"),
          endsAt: new Date("2027-09-06T13:00:00Z"),
          timezone: "UTC",
          actor: { type: "system", id: "integration-test" },
        },
        dependencies(),
      ),
      ["BOOKING_SLOT_NOT_AVAILABLE"],
    );
    const unchanged = await BookingReservation.findById(first.reservation.reservationId)
      .lean<{ startsAt: Date }>();
    expect(unchanged?.startsAt.toISOString()).toBe("2027-09-06T10:00:00.000Z");
  });

  it("successful reschedule releases the old interval and blocks the new one", async () => {
    const original = await reserve(reserveCommand(), dependencies());
    const moved = await reschedule(
      {
        tenantId: original.reservation.tenantId,
        reservationId: original.reservation.reservationId,
        idempotencyKey: crypto.randomUUID(),
        startsAt: new Date("2027-09-06T12:00:00Z"),
        endsAt: new Date("2027-09-06T13:00:00Z"),
        timezone: "UTC",
        actor: { type: "system", id: "integration-test" },
      },
      dependencies(),
    );
    expect(moved.reservation.lifecycleVersion).toBe(2);
    await reserve(
      reserveCommand({
        tenantId: original.reservation.tenantId,
        startsAt: new Date("2027-09-06T10:00:00Z"),
        endsAt: new Date("2027-09-06T11:00:00Z"),
      }),
      dependencies(),
    );
    await expectBookingCode(
      reserve(
        reserveCommand({
          tenantId: original.reservation.tenantId,
          startsAt: new Date("2027-09-06T12:00:00Z"),
          endsAt: new Date("2027-09-06T13:00:00Z"),
        }),
        dependencies(),
      ),
      ["BOOKING_SLOT_NOT_AVAILABLE"],
    );
  });

  it("timely cancel and reject release, while late cancel remains blocking", async () => {
    const timely = await reserve(reserveCommand(), dependencies());
    const cancelled = await cancel(
      {
        tenantId: timely.reservation.tenantId,
        reservationId: timely.reservation.reservationId,
        idempotencyKey: crypto.randomUUID(),
        actor: { type: "system", id: "integration-test" },
        occurredAt: new Date("2027-09-06T09:00:00Z"),
        late: false,
      },
      dependencies(),
    );
    expect(cancelled.reservation.status).toBe("released");

    const late = await reserve(
      reserveCommand({ startsAt: new Date("2027-09-06T14:00:00Z"), endsAt: new Date("2027-09-06T15:00:00Z") }),
      dependencies(),
    );
    const lateResult = await cancel(
      {
        tenantId: late.reservation.tenantId,
        reservationId: late.reservation.reservationId,
        idempotencyKey: crypto.randomUUID(),
        actor: { type: "system", id: "integration-test" },
        occurredAt: new Date("2027-09-06T13:59:00Z"),
        late: true,
      },
      dependencies(),
    );
    expect(lateResult.reservation.status).toBe("pending");
    await expectBookingCode(
      reserve(
        reserveCommand({
          tenantId: late.reservation.tenantId,
          startsAt: new Date("2027-09-06T14:00:00Z"),
          endsAt: new Date("2027-09-06T15:00:00Z"),
        }),
        dependencies(),
      ),
      ["BOOKING_SLOT_NOT_AVAILABLE"],
    );

    const rejectedSource = await reserve(
      reserveCommand({ startsAt: new Date("2027-09-06T16:00:00Z"), endsAt: new Date("2027-09-06T17:00:00Z") }),
      dependencies(),
    );
    const rejected = await reject(
      {
        tenantId: rejectedSource.reservation.tenantId,
        reservationId: rejectedSource.reservation.reservationId,
        idempotencyKey: crypto.randomUUID(),
        actor: { type: "system", id: "integration-test" },
        occurredAt: new Date("2027-09-06T15:00:00Z"),
      },
      dependencies(),
    );
    expect(rejected.reservation.status).toBe("released");
  });

  it("enforces complete/no-show timing and persists one event per commit", async () => {
    const early = await reserve(reserveCommand(), dependencies());
    await expectBookingCode(
      complete(
        {
          tenantId: early.reservation.tenantId,
          reservationId: early.reservation.reservationId,
          idempotencyKey: crypto.randomUUID(),
          actor: { type: "system", id: "integration-test" },
          occurredAt: new Date("2027-09-06T10:59:00Z"),
        },
        dependencies(),
      ),
      ["BOOKING_INVALID_STATE"],
    );
    const completed = await complete(
      {
        tenantId: early.reservation.tenantId,
        reservationId: early.reservation.reservationId,
        idempotencyKey: crypto.randomUUID(),
        actor: { type: "system", id: "integration-test" },
        occurredAt: new Date("2027-09-06T11:00:00Z"),
      },
      dependencies(),
    );
    expect(completed.reservation.status).toBe("completed");

    const missed = await reserve(
      reserveCommand({ startsAt: new Date("2027-09-06T12:00:00Z"), endsAt: new Date("2027-09-06T13:00:00Z") }),
      dependencies(),
    );
    const noShow = await markNoShow(
      {
        tenantId: missed.reservation.tenantId,
        reservationId: missed.reservation.reservationId,
        idempotencyKey: crypto.randomUUID(),
        actor: { type: "system", id: "integration-test" },
        occurredAt: new Date("2027-09-06T13:00:00Z"),
      },
      dependencies(),
    );
    expect(noShow.reservation.status).toBe("no_show");
    expect(await BookingOutboxEvent.countDocuments()).toBe(4);
  });

  it("allows typed schedule/vacation override but never occupancy override", async () => {
    const closed: BookingAvailabilityProvider = {
      async load(input) {
        return {
          query: {
            tenantId: input.tenantId,
            resourceKey: input.resourceKey,
            localDate: input.localDate,
            timezone: "UTC",
            durationMinutes: input.durationMinutes,
            schedule: {},
            vacations: [{ from: input.localDate, to: input.localDate }],
          },
        };
      },
    };
    const command = reserveCommand({
      override: {
        actor: { type: "owner", id: "owner-1" },
        reason: "Termin van redovnog rasporeda",
        bypassedChecks: ["schedule", "vacation"],
        requestedAt: new Date("2027-01-01T00:00:00Z"),
      },
    });
    await reserve(command, dependencies({ availability: closed }));
    await expectBookingCode(
      reserve(
        reserveCommand({ tenantId: command.tenantId, override: command.override }),
        dependencies({ availability: closed }),
      ),
      ["BOOKING_SLOT_NOT_AVAILABLE"],
    );
  });

  it("resolves Service ownership, duration and immutable product snapshot server-side", async () => {
    const tenantId = new Types.ObjectId().toString();
    const otherTenantId = new Types.ObjectId().toString();
    const service = await Service.create({
      tenantId,
      name: "Server service",
      category: "test",
      type: "single",
      duration: 75,
    });
    await expectBookingCode(
      resolveServiceBookingProduct({
        tenantId: otherTenantId,
        serviceId: service._id.toString(),
      }),
      ["BOOKING_PRODUCT_NOT_AVAILABLE"],
    );
    const resolved = await resolveServiceBookingProduct({
      tenantId,
      serviceId: service._id.toString(),
    });
    expect(resolved.resourceKey).toBe("salon");
    expect(resolved.snapshot.durationMinutes).toBe(75);
    expect(resolved.snapshot.name).toBe("Server service");
    await Service.updateOne({ _id: service._id }, { $set: { name: "Changed", duration: 15 } });
    expect(resolved.snapshot).toMatchObject({ name: "Server service", durationMinutes: 75 });
  });

  it("atomically creates Reservation ↔ Appointment with the Service adapter", async () => {
    const tenantId = new Types.ObjectId().toString();
    const clientRef = new Types.ObjectId().toString();
    const appointmentId = new Types.ObjectId().toString();
    await SalonProfile.create({
      tenantId,
      name: "Booking test salon",
      email: "salon@example.test",
      workingHours: { Ponedeljak: [{ from: "09:00", to: "18:00" }] },
      availabilityMode: "workingHours",
    });
    const service = await Service.create({
      tenantId,
      name: "Atomic service",
      category: "test",
      type: "single",
      duration: 60,
    });
    const product = await resolveServiceBookingProduct({
      tenantId,
      serviceId: service._id.toString(),
    });
    const command = reserveCommand({
      tenantId,
      clientRef,
      domainRef: { type: "appointment", id: appointmentId },
      productType: product.productType,
      productRef: product.productRef,
      productSnapshot: product.snapshot,
    });
    const result = await reserve(command, {
      availability: serviceAvailabilityProvider,
      domain: createServiceAppointmentDomainAdapter({
        tenantId,
        draft: {
          clientRef,
          clientName: "Atomic client",
          clientEmail: "client@example.test",
          serviceName: product.snapshot.name,
          services: [
            {
              serviceId: product.productRef,
              serviceName: product.snapshot.name,
              quantity: 1,
              duration: product.snapshot.durationMinutes,
            },
          ],
        },
      }),
    });
    const appointment = await Appointment.findById(appointmentId)
      .lean<{ bookingReservationId: Types.ObjectId; duration: number }>();
    const reservation = await BookingReservation.findById(result.reservation.reservationId)
      .lean<{ domainRef: { type: string; id: string } }>();
    expect(appointment?.bookingReservationId.toString()).toBe(result.reservation.reservationId);
    expect(appointment?.duration).toBe(60);
    expect(reservation?.domainRef).toEqual({ type: "appointment", id: appointmentId });
  });

  it("rolls back Service reservation when Appointment validation fails", async () => {
    const tenantId = new Types.ObjectId().toString();
    const clientRef = new Types.ObjectId().toString();
    await SalonProfile.create({
      tenantId,
      name: "Rollback salon",
      email: "rollback@example.test",
      workingHours: { Ponedeljak: [{ from: "09:00", to: "18:00" }] },
    });
    const service = await Service.create({
      tenantId,
      name: "Rollback service",
      category: "test",
      type: "single",
      duration: 60,
    });
    const product = await resolveServiceBookingProduct({
      tenantId,
      serviceId: service._id.toString(),
    });
    await expectBookingCode(
      reserve(
        reserveCommand({
          tenantId,
          clientRef,
          domainRef: { type: "appointment", id: new Types.ObjectId().toString() },
          productRef: product.productRef,
          productSnapshot: product.snapshot,
        }),
        {
          availability: serviceAvailabilityProvider,
          domain: createServiceAppointmentDomainAdapter({
            tenantId,
            draft: {
              clientRef,
              clientName: "",
              clientEmail: "invalid@example.test",
              serviceName: product.snapshot.name,
              services: [],
            },
          }),
        },
      ),
      ["BOOKING_INFRASTRUCTURE_UNAVAILABLE"],
    );
    expect(await BookingReservation.countDocuments()).toBe(0);
    expect(await Appointment.countDocuments()).toBe(0);
    expect(await BookingOutboxEvent.countDocuments()).toBe(0);
  });
});
