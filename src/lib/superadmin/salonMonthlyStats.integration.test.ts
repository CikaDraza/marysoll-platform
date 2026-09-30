import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/mongodb", () => ({
  connectToDB: vi.fn(async () => mongoose),
}));

import { Appointment } from "@/models/Appointment";
import { Tenant } from "@/models/Tenant";
import { TenantUser } from "@/models/TenantUser";
import { TenantUsageHistory } from "@/models/TenantUsageHistory";
import { belgradeMonthRange, getSalonMonthlyStats } from "./salonMonthlyStats";

let mongo: MongoMemoryServer;

const ANJA = new Types.ObjectId();
const QUIET = new Types.ObjectId();
const CLIENT_A = new Types.ObjectId();
const CLIENT_B = new Types.ObjectId();
const CLIENT_C = new Types.ObjectId();

function appointment(input: {
  tenantId: Types.ObjectId;
  clientProfileId: Types.ObjectId | null;
  date: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}) {
  return {
    tenantId: input.tenantId,
    clientProfileId: input.clientProfileId,
    clientName: "Klijentkinja",
    clientEmail: "klijent@example.com",
    serviceName: "Lash lift",
    date: input.date,
    time: "10:00",
    duration: 60,
    status: input.status,
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.createdAt),
    ...(input.completedAt ? { completedAt: new Date(input.completedAt) } : {}),
  };
}

function staff(tenantId: Types.ObjectId, role: string, status: string) {
  return {
    tenantId,
    email: `${role}-${status}-${new Types.ObjectId()}@example.com`,
    name: `${role} ${status}`,
    role,
    status,
  };
}

function snapshot(
  tenantId: Types.ObjectId,
  iso: string,
  mongoEstimateMb: number,
  cloudinaryMb: number,
) {
  return {
    captureId: new Types.ObjectId(),
    tenantId,
    capturedAt: new Date(iso),
    source: "cron",
    plan: "maria",
    mongoEstimateMb,
    cloudinaryMb,
    activeStaffCount: 1,
  };
}

describe.sequential("superadmin salon monthly stats", () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: "salon-monthly-stats" });

    await Tenant.collection.insertMany([
      { _id: ANJA, name: "The Lash Room", slug: "the-lash-room-by-anja" },
      { _id: QUIET, name: "Tihi salon", slug: "tihi-salon" },
    ]);

    // Raw insert: fiksni createdAt/completedAt i legacy termin bez profila.
    await Appointment.collection.insertMany([
      // A ima dva oktobarska termina (jedan potvrđen) → jedan klijent.
      appointment({
        tenantId: ANJA,
        clientProfileId: CLIENT_A,
        date: "2026-10-03",
        status: "appointment_approved",
        createdAt: "2026-09-20T10:00:00Z",
      }),
      appointment({
        tenantId: ANJA,
        clientProfileId: CLIENT_A,
        date: "2026-10-17",
        status: "completed",
        createdAt: "2026-10-01T08:00:00Z",
        completedAt: "2026-10-17T12:00:00Z",
      }),
      // B: potvrđen i otkazan termin.
      appointment({
        tenantId: ANJA,
        clientProfileId: CLIENT_B,
        date: "2026-10-09",
        status: "appointment_approved",
        createdAt: "2026-10-02T08:00:00Z",
      }),
      appointment({
        tenantId: ANJA,
        clientProfileId: CLIENT_B,
        date: "2026-10-10",
        status: "appointment_cancelled",
        createdAt: "2026-10-02T09:00:00Z",
      }),
      // C: čeka i nije došla.
      appointment({
        tenantId: ANJA,
        clientProfileId: CLIENT_C,
        date: "2026-10-21",
        status: "pending",
        createdAt: "2026-10-15T08:00:00Z",
      }),
      appointment({
        tenantId: ANJA,
        clientProfileId: CLIENT_C,
        date: "2026-10-22",
        status: "no_show",
        createdAt: "2026-10-15T09:00:00Z",
      }),
      // Legacy termin bez profila: broji se kao termin, ne kao klijent.
      appointment({
        tenantId: ANJA,
        clientProfileId: null,
        date: "2026-10-30",
        status: "appointment_approved",
        createdAt: "2026-10-29T09:00:00Z",
      }),
      // Kreiran u oktobru za novembar → workload oktobra, volume novembra.
      appointment({
        tenantId: ANJA,
        clientProfileId: CLIENT_A,
        date: "2026-11-10",
        status: "pending",
        createdAt: "2026-10-20T10:00:00Z",
      }),
      // Kreiran 31. 10. u 23:30 po Beogradu (22:30 UTC) → i dalje oktobar.
      appointment({
        tenantId: ANJA,
        clientProfileId: CLIENT_B,
        date: "2026-11-12",
        status: "pending",
        createdAt: "2026-10-31T22:30:00Z",
      }),
      // Septembarski termin završen tek 1. 10. u 00:30 po Beogradu.
      appointment({
        tenantId: ANJA,
        clientProfileId: CLIENT_C,
        date: "2026-09-30",
        status: "completed",
        createdAt: "2026-09-01T10:00:00Z",
        completedAt: "2026-09-30T22:30:00Z",
      }),
    ]);

    await TenantUser.collection.insertMany([
      staff(ANJA, "OWNER", "active"),
      staff(ANJA, "STAFF", "active"),
      staff(ANJA, "STAFF", "invited"),
      staff(ANJA, "STAFF", "suspended"),
      staff(ANJA, "USER", "active"),
      staff(QUIET, "OWNER", "active"),
    ]);

    await TenantUsageHistory.collection.insertMany([
      snapshot(ANJA, "2026-09-30T21:10:00Z", 0.3, 6.728),
      snapshot(ANJA, "2026-10-15T22:10:00Z", 0.4, 7),
      snapshot(ANJA, "2026-10-31T22:10:00Z", 0.47, 9.1),
      // Tihi salon nema termine, ali ima potrošnju u oktobru.
      snapshot(QUIET, "2026-10-02T22:10:00Z", 0.05, 1),
      snapshot(QUIET, "2026-10-30T22:10:00Z", 0.06, 1),
    ]);
  }, 90_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  it("uses Europe/Belgrade month boundaries", () => {
    const { start, end } = belgradeMonthRange(2026, 10);
    expect(start.toISOString()).toBe("2026-09-30T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-31T23:00:00.000Z");
  });

  it("separates scheduled, created and completed clocks with distinct client profiles", async () => {
    const stats = await getSalonMonthlyStats({ year: 2026, month: 10 });
    const anja = stats.find((row) => row.tenantId === ANJA.toString());

    expect(anja).toMatchObject({
      salonName: "The Lash Room",
      appointmentsScheduled: 7,
      appointmentsCreated: 8,
      appointmentsCompleted: 2,
      clientsBooked: 3,
      clientsApproved: 2,
      nova: 3,
      cekaNaOdobrenje: 1,
      zavrsena: 1,
      otkazana: 1,
      nijeSePojavilo: 1,
      activeStaffCount: 2,
    });
    expect(anja?.usageGrowth).toMatchObject({
      openingFromPreviousMonth: true,
      mongoDeltaMb: 0.17,
      cloudinaryDeltaMb: 2.372,
      closingMongoMb: 0.47,
    });
  });

  it("includes a salon with usage history but no appointments", async () => {
    const stats = await getSalonMonthlyStats({ year: 2026, month: 10 });
    const quiet = stats.find((row) => row.tenantId === QUIET.toString());

    expect(quiet).toMatchObject({
      appointmentsScheduled: 0,
      appointmentsCreated: 0,
      clientsBooked: 0,
      activeStaffCount: 1,
    });
    expect(quiet?.usageGrowth?.openingFromPreviousMonth).toBe(false);
    expect(quiet?.usageGrowth?.mongoDeltaMb).toBe(0.01);
    expect(stats[0].tenantId).toBe(ANJA.toString());
  });

  it("counts November volume from October-created appointments", async () => {
    const stats = await getSalonMonthlyStats({ year: 2026, month: 11 });
    const anja = stats.find((row) => row.tenantId === ANJA.toString());

    expect(anja).toMatchObject({
      appointmentsScheduled: 2,
      appointmentsCreated: 0,
      clientsBooked: 2,
      usageGrowth: null,
    });
  });
});
