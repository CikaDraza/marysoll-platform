import { NextRequest } from "next/server";
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Appointment } from "@/models/Appointment";
import { Voucher } from "@/models/Voucher";
import { createPriceProposal } from "@/lib/appointments/priceProposal";
import type { IAppointmentPricing } from "@/types";
import { PUT } from "./update/[id]/route";

const authState = vi.hoisted(() => ({
  decoded: {
    id: "0000000000000000000000c1",
    tenantId: "0000000000000000000000a1",
    tenantUserId: "0000000000000000000000c1",
    isAdmin: false,
    isSuperAdmin: false,
  },
}));

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: async () => undefined }));
vi.mock("@/lib/auth/auth-server", () => ({
  verifyToken: () => authState.decoded,
  resolveTenant: async () => null,
}));
vi.mock("@/lib/platform/capabilities-server", () => ({
  requireCapability: async () => null,
}));
vi.mock("@/lib/notificationService", () => ({
  createAppointmentNotification: vi.fn(async () => null),
  createPriceProposalNotification: vi.fn(async () => null),
}));
vi.mock("@/lib/plans/subscriptionService", () => ({
  tenantHasFeature: vi.fn(async () => true),
}));
vi.mock("@/lib/loyalty/notifications", () => ({
  createLoyaltyNotification: vi.fn(async () => null),
  notifyAdminsCompletionPrompt: vi.fn(async () => null),
}));

let replSet: MongoMemoryReplSet;

const TENANT = new Types.ObjectId("0000000000000000000000a1");
const CLIENT = new Types.ObjectId("0000000000000000000000c1");
const ADMIN = new Types.ObjectId("0000000000000000000000d1");
const SERVICE = new Types.ObjectId("0000000000000000000000e1");

function pricing(): IAppointmentPricing {
  return {
    mode: "on_request",
    currency: "RSD",
    baseAmount: null,
    minimumTotal: null,
    knownAddonsTotal: 400,
    quotedBaseAmount: null,
    quotedTotal: null,
    quotedAt: null,
    quotedBy: null,
    chargedAmount: null,
    chargedAt: null,
    chargedBy: null,
    lines: [],
  };
}

async function seedAppointment(overrides: Record<string, unknown> = {}) {
  const canonicalPricing = pricing();
  return Appointment.create({
    tenantId: TENANT,
    clientProfileId: CLIENT,
    clientName: "Marija",
    clientEmail: "marija@example.com",
    serviceName: "Izlivanje nokta",
    services: [
      {
        serviceId: SERVICE,
        serviceName: "Izlivanje nokta",
        quantity: 1,
        price: null,
        duration: 90,
      },
    ],
    pricing: canonicalPricing,
    priceProposal: createPriceProposal(
      canonicalPricing,
      7500,
      String(ADMIN),
      new Date("2026-09-26T08:00:00.000Z"),
    ),
    date: "2099-09-28",
    time: "14:30",
    duration: 90,
    status: "pending",
    ...overrides,
  });
}

async function seedVoucher(appointmentId: Types.ObjectId) {
  return Voucher.create({
    tenantId: TENANT,
    code: `PRICE-${new Types.ObjectId().toString().slice(-8).toUpperCase()}`,
    type: "percent",
    value: 10,
    serviceScope: [],
    origin: "auto_rule",
    ownerTenantUserId: CLIENT,
    status: "reserved",
    reservedAppointmentId: appointmentId,
  });
}

function asClient() {
  authState.decoded.isAdmin = false;
  authState.decoded.tenantUserId = String(CLIENT);
}

function asAdmin() {
  authState.decoded.isAdmin = true;
  authState.decoded.tenantUserId = String(ADMIN);
}

async function updateAppointment(
  appointmentId: Types.ObjectId,
  body: Record<string, unknown>,
) {
  return PUT(
    new NextRequest(
      `http://localhost/api/appointments/update/${appointmentId}`,
      {
        method: "PUT",
        headers: {
          authorization: "Bearer integration-token",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    ),
    { params: Promise.resolve({ id: String(appointmentId) }) },
  );
}

function mutateBeforeDecisionWrite(mutate: () => Promise<unknown>) {
  const original = Appointment.findOneAndUpdate.bind(Appointment);
  vi.spyOn(Appointment, "findOneAndUpdate").mockImplementationOnce(((
    filter: unknown,
    update: unknown,
    options: unknown,
  ) =>
    mutate().then(() =>
      original(filter as never, update as never, options as never),
    )) as typeof Appointment.findOneAndUpdate);
}

describe.sequential("price proposal atomic workflow", () => {
  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    await mongoose.connect(replSet.getUri(), {
      dbName: "price-proposal-decision-test",
    });
    await Voucher.syncIndexes();
  }, 90_000);

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet?.stop();
  });

  beforeEach(async () => {
    asClient();
    await Promise.all([Appointment.deleteMany({}), Voucher.deleteMany({})]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("predlog salona ne menja canonical quote", async () => {
    asAdmin();
    const appointment = await seedAppointment({ priceProposal: undefined });

    const response = await updateAppointment(appointment._id, {
      status: "appointment_approved",
      pricingAmount: 7500,
    });

    expect(response.status).toBe(200);
    const saved = await Appointment.findById(appointment._id).lean<{
      status: string;
      pricing: IAppointmentPricing;
      priceProposal?: { quotedBaseAmount: number; quotedTotal: number };
    }>();
    expect(saved?.status).toBe("pending");
    expect(saved?.priceProposal).toMatchObject({
      quotedBaseAmount: 7500,
      quotedTotal: 7900,
    });
    expect(saved?.pricing.quotedBaseAmount).toBeNull();
    expect(saved?.pricing.quotedTotal).toBeNull();
  });

  it("accept upisuje canonical quote, odobrava termin i brise predlog", async () => {
    const appointment = await seedAppointment();

    const response = await updateAppointment(appointment._id, {
      priceProposalDecision: "accept",
    });

    expect(response.status).toBe(200);
    const saved = await Appointment.findById(appointment._id).lean<{
      status: string;
      pricing: IAppointmentPricing;
      priceProposal?: unknown;
    }>();
    expect(saved?.status).toBe("appointment_approved");
    expect(saved?.pricing.quotedBaseAmount).toBe(7500);
    expect(saved?.pricing.quotedTotal).toBe(7900);
    expect(saved?.priceProposal).toBeUndefined();
  });

  it("reject odbija termin, brise predlog i oslobadja rezervisan vaucer", async () => {
    const appointment = await seedAppointment();
    const voucher = await seedVoucher(appointment._id);
    await Appointment.updateOne(
      { _id: appointment._id },
      { $set: { appliedVoucherId: voucher._id } },
    );

    const response = await updateAppointment(appointment._id, {
      priceProposalDecision: "reject",
    });

    expect(response.status).toBe(200);
    const saved = await Appointment.findById(appointment._id).lean<{
      status: string;
      priceProposal?: unknown;
    }>();
    expect(saved?.status).toBe("appointment_rejected");
    expect(saved?.priceProposal).toBeUndefined();
    expect(
      (await Voucher.findById(voucher._id).lean<{ status: string }>())?.status,
    ).toBe("active");
  });

  it("stari predlog dobija 409 i ne moze da obrise noviji", async () => {
    const appointment = await seedAppointment();
    const newerAt = new Date("2026-09-26T09:00:00.000Z");
    mutateBeforeDecisionWrite(() =>
      Appointment.updateOne(
        { _id: appointment._id },
        { $set: { "priceProposal.proposedAt": newerAt } },
      ),
    );

    const response = await updateAppointment(appointment._id, {
      priceProposalDecision: "accept",
    });

    expect(response.status).toBe(409);
    const saved = await Appointment.findById(appointment._id).lean<{
      status: string;
      priceProposal?: { proposedAt: Date };
      pricing: IAppointmentPricing;
    }>();
    expect(saved?.status).toBe("pending");
    expect(saved?.priceProposal?.proposedAt).toEqual(newerAt);
    expect(saved?.pricing.quotedTotal).toBeNull();
  });

  it("V1 -> V2 voucher race dobija 409 bez upisa V1 aritmetike", async () => {
    const appointment = await seedAppointment();
    const voucherV1 = await seedVoucher(appointment._id);
    const voucherV2 = await seedVoucher(appointment._id);
    await Appointment.updateOne(
      { _id: appointment._id },
      { $set: { appliedVoucherId: voucherV1._id } },
    );
    mutateBeforeDecisionWrite(() =>
      Appointment.updateOne(
        { _id: appointment._id },
        { $set: { appliedVoucherId: voucherV2._id } },
      ),
    );

    const response = await updateAppointment(appointment._id, {
      priceProposalDecision: "accept",
    });

    expect(response.status).toBe(409);
    const saved = await Appointment.findById(appointment._id).lean<{
      status: string;
      appliedVoucherId?: Types.ObjectId;
      pricing: IAppointmentPricing;
      discountAmount?: number;
    }>();
    expect(saved?.status).toBe("pending");
    expect(String(saved?.appliedVoucherId)).toBe(String(voucherV2._id));
    expect(saved?.pricing.quotedTotal).toBeNull();
    expect(saved?.discountAmount).toBeUndefined();
  });

  it("status race dobija 409 i ne vraca termin u approved", async () => {
    const appointment = await seedAppointment();
    mutateBeforeDecisionWrite(() =>
      Appointment.updateOne(
        { _id: appointment._id },
        { $set: { status: "appointment_cancelled" } },
      ),
    );

    const response = await updateAppointment(appointment._id, {
      priceProposalDecision: "accept",
    });

    expect(response.status).toBe(409);
    const saved = await Appointment.findById(appointment._id).lean<{
      status: string;
      priceProposal?: unknown;
    }>();
    expect(saved?.status).toBe("appointment_cancelled");
    expect(saved?.priceProposal).toBeDefined();
  });
});
