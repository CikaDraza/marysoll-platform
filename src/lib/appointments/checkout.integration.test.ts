/**
 * T1-4 — Appointment Checkout (§20–§25) nad pravim Mongo ReplSet-om.
 *
 * Ovde se dokazuje ono što je do sada bilo razliveno po ruti i modalu:
 * „za naplatu" i „stvarno naplaćeno" nisu ista činjenica, poeni se knjiže na
 * STVARNU potrošnju, a do `completed` vodi tačno jedan put.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Appointment } from "@/models/Appointment";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { Voucher } from "@/models/Voucher";
import {
  completeAppointmentCheckout,
  previewAppointmentCheckout,
} from "./checkout";
import { loyaltyOnAppointmentStatusChange } from "@/lib/loyalty/hooks";
import type { IAppointmentPricing } from "@/types";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: async () => undefined }));
vi.mock("@/lib/plans/subscriptionService", () => ({
  tenantHasFeature: vi.fn(async () => true),
}));
vi.mock("@/lib/loyalty/notifications", () => ({
  createLoyaltyNotification: vi.fn(async () => null),
  notifyAdminsCompletionPrompt: vi.fn(async () => null),
}));

let replSet: MongoMemoryReplSet;

const TENANT = new Types.ObjectId();
const CLIENT = new Types.ObjectId();
const SERVICE = new Types.ObjectId();
const ADMIN = new Types.ObjectId();

const actor = { tenantId: String(TENANT), adminTenantUserId: String(ADMIN) };

interface AppointmentRow {
  status: string;
  pricing?: IAppointmentPricing;
  originalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  appliedVoucherId?: Types.ObjectId;
}
interface LedgerRow { amount: number; currency: string; entryType: string }
interface VoucherRow { status: string }

function pricing(overrides: Partial<IAppointmentPricing>): IAppointmentPricing {
  return {
    mode: "fixed",
    currency: "RSD",
    baseAmount: 4000,
    minimumTotal: 4000,
    knownAddonsTotal: 0,
    quotedBaseAmount: null,
    quotedTotal: null,
    quotedAt: null,
    quotedBy: null,
    chargedAmount: null,
    chargedAt: null,
    chargedBy: null,
    lines: [],
    ...overrides,
  } as IAppointmentPricing;
}

async function seedConfig() {
  await LoyaltyConfig.deleteMany({});
  return LoyaltyConfig.create({
    tenantId: TENANT,
    enabled: true,
    currencies: {
      hearts: { enabled: true, nameOne: "srce", nameFew: "srca", nameMany: "srca", emoji: "❤️" },
      points: {
        enabled: true,
        nameOne: "poen",
        nameFew: "poena",
        nameMany: "poena",
        emoji: "⭐",
        per100Rsd: 1,
      },
    },
    earning: { heartsPerCompletedVisit: 1, welcomeBonusPoints: 0, checkinPoints: 0 },
    milestones: [],
    antiAbuse: { maxHeartsPerDay: 3, maxPointsPerDay: 2000 },
  });
}

async function seedAppointment(overrides: Record<string, unknown> = {}) {
  return Appointment.create({
    tenantId: TENANT,
    clientProfileId: CLIENT,
    clientName: "Ana",
    clientEmail: "ana@example.com",
    serviceName: "Gel lak",
    services: [
      { serviceId: SERVICE, serviceName: "Gel lak", quantity: 1, price: 4000, duration: 60 },
    ],
    pricing: pricing({}),
    date: "2099-01-01",
    time: "10:00",
    duration: 60,
    status: "appointment_approved",
    ...overrides,
  });
}

async function seedReservedVoucher(appointmentId: Types.ObjectId, overrides = {}) {
  return Voucher.create({
    tenantId: TENANT,
    code: `V-${new Types.ObjectId().toString().slice(-8).toUpperCase()}`,
    type: "percent",
    value: 20,
    serviceScope: [],
    origin: "auto_rule",
    ownerTenantUserId: CLIENT,
    status: "reserved",
    reservedAppointmentId: appointmentId,
    ...overrides,
  });
}

const readAppointment = (id: unknown) => Appointment.findById(id).lean<AppointmentRow>();

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri(), { dbName: "checkout-test" });
  await Promise.all([LoyaltyLedger.syncIndexes(), LoyaltyEvent.syncIndexes()]);
}, 90_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

beforeEach(async () => {
  await Promise.all([
    Appointment.deleteMany({}),
    LoyaltyAccount.deleteMany({}),
    LoyaltyLedger.deleteMany({}),
    LoyaltyEvent.deleteMany({}),
    Voucher.deleteMany({}),
  ]);
  await seedConfig();
});

// ─── PREVIEW (24–26) ──────────────────────────────────────────────────────────

describe("pregled računa", () => {
  it("24. poznata fiksna cena + vaučer → tačan iznos za naplatu", async () => {
    const appt = await seedAppointment();
    await seedReservedVoucher(appt._id);
    await Appointment.updateOne(
      { _id: appt._id },
      { $set: { appliedVoucherId: (await Voucher.findOne({}).lean<{ _id: Types.ObjectId }>())!._id } },
    );

    const preview = await previewAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
    });

    expect(preview.priceBeforeBenefit).toBe(4000);
    expect(preview.priceBeforeBenefitSource).toBe("catalog");
    expect(preview.discountAmount).toBe(800);
    expect(preview.amountDue).toBe(3200);
    expect(preview.chargedAmountDefault).toBe(3200);
    expect(preview.requiresAgreedPrice).toBe(false);
    expect(preview.benefit?.status).toBe("reserved");
  });

  it("25. `on_request` + vaučer bez dogovorene cene TRAŽI cenu umesto da izmisli iznos", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "on_request", baseAmount: null, minimumTotal: null }),
    });
    const voucher = await seedReservedVoucher(appt._id);
    await Appointment.updateOne({ _id: appt._id }, { $set: { appliedVoucherId: voucher._id } });

    const blind = await previewAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
    });
    expect(blind.requiresAgreedPrice).toBe(true);
    expect(blind.priceBeforeBenefit).toBeNull();
    expect(blind.discountAmount).toBeNull();
    expect(blind.amountDue).toBeNull();

    const withPrice = await previewAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
      amounts: { agreedPrice: 4000 },
    });
    expect(withPrice.requiresAgreedPrice).toBe(false);
    expect(withPrice.priceBeforeBenefitSource).toBe("agreed");
    expect(withPrice.discountAmount).toBe(800);
    expect(withPrice.amountDue).toBe(3200);
  });

  it("`from` bez potvrđene cene, sa vaučerom, takođe traži dogovorenu cenu", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "from", baseAmount: 2000, minimumTotal: 2000 }),
    });
    const voucher = await seedReservedVoucher(appt._id);
    await Appointment.updateOne({ _id: appt._id }, { $set: { appliedVoucherId: voucher._id } });

    const preview = await previewAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
    });
    // Minimum je donja granica, ne dogovor — prikazuje se, ali se traži potvrda.
    expect(preview.priceBeforeBenefit).toBe(2000);
    expect(preview.requiresAgreedPrice).toBe(true);
  });

  it("26. dogovorena cena → popust → predlog stvarno naplaćenog", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "on_request", baseAmount: null, minimumTotal: null }),
    });
    const voucher = await seedReservedVoucher(appt._id, { type: "fixed", value: 500 });
    await Appointment.updateOne({ _id: appt._id }, { $set: { appliedVoucherId: voucher._id } });

    const preview = await previewAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
      amounts: { agreedPrice: 3500 },
    });
    expect(preview.discountAmount).toBe(500);
    expect(preview.amountDue).toBe(3000);
    expect(preview.chargedAmountDefault).toBe(3000);
  });

  it("očekivana zarada dolazi sa servera i poštuje dnevni limit", async () => {
    const appt = await seedAppointment();
    const preview = await previewAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
    });
    expect(preview.expectedEarning.hearts).toBe(1);
    expect(preview.expectedEarning.points).toBe(40);
    expect(preview.expectedEarning.capped).toBe(false);
  });
});

// ─── COMPLETION (27–31) ───────────────────────────────────────────────────────

describe("završetak termina", () => {
  it("27. stvarno naplaćeno se razlikuje od `finalPrice` → poeni idu na naplaćeno", async () => {
    const appt = await seedAppointment();
    const voucher = await seedReservedVoucher(appt._id);
    await Appointment.updateOne({ _id: appt._id }, { $set: { appliedVoucherId: voucher._id } });

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
      amounts: { chargedAmount: 3000 },
    });

    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("completed");
    expect(saved?.finalPrice).toBe(3200);
    expect(saved?.pricing?.chargedAmount).toBe(3000);

    // 3000 RSD × 1 poen/100 RSD = 30 — ne 32 sa `finalPrice`.
    const points = await LoyaltyLedger.findOne({
      currency: "points",
      entryType: "earn",
    }).lean<LedgerRow>();
    expect(points?.amount).toBe(30);
  });

  it("28. nepoznata cena bez vaučera SME da ostane nepoznata", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "on_request", baseAmount: null, minimumTotal: null }),
    });

    await completeAppointmentCheckout({ appointmentId: String(appt._id), actor });

    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("completed");
    expect(saved?.pricing?.chargedAmount).toBeNull();
    expect(saved?.finalPrice).toBeUndefined();

    // Bez cene nema poena, ali srce po poseti ostaje.
    const points = await LoyaltyLedger.findOne({ currency: "points" }).lean<LedgerRow>();
    expect(points).toBeNull();
    const hearts = await LoyaltyLedger.findOne({ currency: "hearts" }).lean<LedgerRow>();
    expect(hearts?.amount).toBe(1);
  });

  it("29. završetak pretvara rezervisan vaučer u iskorišćen", async () => {
    const appt = await seedAppointment();
    const voucher = await seedReservedVoucher(appt._id);
    await Appointment.updateOne({ _id: appt._id }, { $set: { appliedVoucherId: voucher._id } });

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
      amounts: { chargedAmount: 3200 },
    });

    const after = await Voucher.findById(voucher._id).lean<VoucherRow>();
    expect(after?.status).toBe("redeemed");
  });

  it("30. otkazivanje pre završetka vraća vaučer u novčanik", async () => {
    const appt = await seedAppointment();
    const voucher = await seedReservedVoucher(appt._id);
    await Appointment.updateOne({ _id: appt._id }, { $set: { appliedVoucherId: voucher._id } });

    await Appointment.updateOne({ _id: appt._id }, { $set: { status: "no_show" } });
    await loyaltyOnAppointmentStatusChange(
      String(appt._id),
      "appointment_approved",
      "no_show",
    );

    const after = await Voucher.findById(voucher._id).lean<VoucherRow>();
    expect(after?.status).toBe("active");
  });

  it("31. revert završetka i dalje radi (postojeći unRedeem ugovor)", async () => {
    const appt = await seedAppointment();
    const voucher = await seedReservedVoucher(appt._id);
    await Appointment.updateOne({ _id: appt._id }, { $set: { appliedVoucherId: voucher._id } });

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
      amounts: { chargedAmount: 3200 },
    });
    expect((await Voucher.findById(voucher._id).lean<VoucherRow>())?.status).toBe("redeemed");

    await Appointment.updateOne({ _id: appt._id }, { $set: { status: "appointment_approved" } });
    await loyaltyOnAppointmentStatusChange(
      String(appt._id),
      "completed",
      "appointment_approved",
    );

    expect((await Voucher.findById(voucher._id).lean<VoucherRow>())?.status).toBe("reserved");
    // Kompenzacioni unosi poništavaju NET efekat.
    const sum = await LoyaltyLedger.aggregate([
      { $match: { currency: "points" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    expect(sum[0]?.total ?? 0).toBe(0);
  });

  it("dvostruki poziv ne obrađuje termin dvaput", async () => {
    const appt = await seedAppointment();
    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
      amounts: { chargedAmount: 4000 },
    });
    const retry = await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
      amounts: { chargedAmount: 4000 },
    });

    expect(retry.alreadyCompleted).toBe(true);
    const hearts = await LoyaltyLedger.countDocuments({ currency: "hearts" });
    expect(hearts).toBe(1);
  });

  it("checkout drugog salona ne vidi termin", async () => {
    const appt = await seedAppointment();
    await expect(
      previewAppointmentCheckout({
        appointmentId: String(appt._id),
        actor: { tenantId: String(new Types.ObjectId()) },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("dogovorena cena se upisuje kao canonical quote, ne kao naplaćeno", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "on_request", baseAmount: null, minimumTotal: null }),
    });
    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
      amounts: { agreedPrice: 4200, chargedAmount: 4200 },
    });

    const saved = await readAppointment(appt._id);
    expect(saved?.pricing?.quotedTotal).toBe(4200);
    expect(saved?.pricing?.chargedAmount).toBe(4200);
    expect(saved?.pricing?.quotedBy).toBe(String(ADMIN));
  });
});
