/**
 * Depozit — dva stvarna scenarija naplate, nad pravim Mongo ReplSet-om.
 *
 * A) depozit online → ostatak online → račun zatvoren
 * B) depozit online → ostatak u KEŠU u salonu
 *
 * Faza 1 radi sa `provider: "manual"`: nijedan poziv ka provajderu, nikakva
 * regulatorna izloženost, a ceo domen (namere, ledger, poravnanje, granice)
 * dokazan pre nego što ijedan novac prođe kroz treću stranu.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Appointment } from "@/models/Appointment";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { PaymentIntent } from "@/models/PaymentIntent";
import { PaymentLedger } from "@/models/PaymentLedger";
import { Voucher } from "@/models/Voucher";
import {
  appointmentSettlement,
  createPaymentIntent,
  settlePaymentIntent,
} from "./intents";
import {
  completeAppointmentCheckout,
  previewAppointmentCheckout,
} from "@/lib/appointments/checkout";
import { evaluateDeposit, toMinor } from "@/lib/platform/payments-client";
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

/** Šminkanje za svadbu — 4.800 RSD, depozit 1.000 RSD. */
const SERVICE_PRICE = 4800;
const DEPOSIT = 1000;

const actor = { tenantId: String(TENANT), adminTenantUserId: String(ADMIN) };

interface AppointmentRow {
  status: string;
  pricing?: IAppointmentPricing;
  discountAmount?: number;
  finalPrice?: number;
}
interface LedgerRow {
  entryType: string;
  amountMinor: number;
  account: string;
  description: string;
}

const readAppointment = (id: unknown) => Appointment.findById(id).lean<AppointmentRow>();

function pricing(overrides: Partial<IAppointmentPricing> = {}): IAppointmentPricing {
  return {
    mode: "fixed",
    currency: "RSD",
    baseAmount: SERVICE_PRICE,
    minimumTotal: SERVICE_PRICE,
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

async function seedAppointment(overrides: Record<string, unknown> = {}) {
  return Appointment.create({
    tenantId: TENANT,
    clientProfileId: CLIENT,
    clientName: "Ana",
    clientEmail: "ana@example.com",
    serviceName: "Šminkanje za svadbu",
    services: [
      {
        serviceId: SERVICE,
        serviceName: "Šminkanje za svadbu",
        quantity: 1,
        price: SERVICE_PRICE,
        duration: 90,
      },
    ],
    pricing: pricing(),
    date: "2099-06-15",
    time: "10:00",
    duration: 90,
    status: "appointment_approved",
    ...overrides,
  });
}

/** Naplati depozit onako kako bi to uradio stvarni tok pri zakazivanju. */
async function payDeposit(appointmentId: Types.ObjectId, amount = DEPOSIT) {
  const intent = await createPaymentIntent({
    actor,
    appointmentId: String(appointmentId),
    clientTenantUserId: String(CLIENT),
    purpose: "appointment_deposit",
    amountMinor: toMinor(amount),
    pricedAgainst: {
      preBenefitAmountMinor: toMinor(SERVICE_PRICE),
      benefitVoucherId: null,
      amountDueMinor: toMinor(SERVICE_PRICE),
    },
    policySnapshot: { forfeitOnLateCancel: true, amountMinor: toMinor(amount) },
    idempotencyKey: `deposit:${String(appointmentId)}`,
  });
  await settlePaymentIntent({
    actor,
    intentId: intent.intentId,
    account: "salon_payable",
    description: `Depozit — Šminkanje za svadbu`,
  });
  return intent;
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri(), { dbName: "deposit-flow-test" });
  await Promise.all([
    PaymentIntent.syncIndexes(),
    PaymentLedger.syncIndexes(),
    LoyaltyLedger.syncIndexes(),
    LoyaltyEvent.syncIndexes(),
  ]);
}, 90_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

beforeEach(async () => {
  await Promise.all([
    Appointment.deleteMany({}),
    PaymentIntent.deleteMany({}),
    PaymentLedger.deleteMany({}),
    LoyaltyAccount.deleteMany({}),
    LoyaltyLedger.deleteMany({}),
    LoyaltyEvent.deleteMany({}),
    Voucher.deleteMany({}),
    LoyaltyConfig.deleteMany({}),
  ]);
  await LoyaltyConfig.create({
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
    pointsShop: [],
    antiAbuse: { maxHeartsPerDay: 100, maxPointsPerDay: 100000 },
  });
});

// ─── SCENARIO A ───────────────────────────────────────────────────────────────

describe("A. depozit online → ostatak online", () => {
  it("račun se zatvara: 1.000 + 3.800 = 4.800", async () => {
    const appt = await seedAppointment();
    await payDeposit(appt._id);

    // Vlasnica otvara Checkout — vidi šta je već stiglo.
    const preview = await previewAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
    });
    expect(preview.priceBeforeBenefit).toBe(SERVICE_PRICE);
    expect(preview.amountDue).toBe(SERVICE_PRICE);
    expect(preview.paidOnline).toBe(DEPOSIT);
    expect(preview.remainingDue).toBe(3800);

    // Ostatak se naplaćuje online — druga namera nad istim terminom.
    const balance = await createPaymentIntent({
      actor,
      appointmentId: String(appt._id),
      clientTenantUserId: String(CLIENT),
      purpose: "appointment_balance",
      amountMinor: toMinor(3800),
      idempotencyKey: `balance:${String(appt._id)}`,
    });
    await settlePaymentIntent({
      actor,
      intentId: balance.intentId,
      account: "salon_payable",
      description: "Ostatak — Šminkanje za svadbu",
    });

    const settled = await appointmentSettlement({
      tenantId: String(TENANT),
      appointmentId: String(appt._id),
      amountDueMinor: toMinor(SERVICE_PRICE),
    });
    expect(settled.capturedMinor).toBe(toMinor(SERVICE_PRICE));
    expect(settled.remainingDueMinor).toBe(0);

    // Završetak upisuje UKUPNU vrednost termina.
    const result = await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
      amounts: { chargedAmount: SERVICE_PRICE },
    });
    expect(result.chargedAmount).toBe(SERVICE_PRICE);

    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("completed");
    expect(saved?.pricing?.chargedAmount).toBe(SERVICE_PRICE);

    // Depozit se ODUZIMA od računa — ne vraća pa ponovo naplaćuje.
    const entries = await PaymentLedger.find({}).sort({ createdAt: 1 }).lean<LedgerRow[]>();
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.amountMinor)).toEqual([toMinor(1000), toMinor(3800)]);
    expect(entries.every((e) => e.entryType === "capture")).toBe(true);
    expect(await PaymentLedger.countDocuments({ entryType: "refund" })).toBe(0);

    // Poeni idu na STVARNO naplaćeno (4.800 → 48), ne na depozit.
    const points = await LoyaltyLedger.findOne({ currency: "points" }).lean<{
      amount: number;
    }>();
    expect(points?.amount).toBe(48);
  });
});

// ─── SCENARIO B ───────────────────────────────────────────────────────────────

describe("B. depozit online → ostatak u kešu u salonu", () => {
  it("ledger nosi samo depozit; razlika je salonov direktan prihod", async () => {
    const appt = await seedAppointment();
    await payDeposit(appt._id);

    const preview = await previewAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
    });
    expect(preview.paidOnline).toBe(DEPOSIT);
    expect(preview.remainingDue).toBe(3800);

    // Vlasnica naplati 3.800 u kešu i potvrdi UKUPNO naplaćeno.
    const result = await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
      amounts: { chargedAmount: SERVICE_PRICE },
    });
    expect(result.chargedAmount).toBe(SERVICE_PRICE);

    // Kroz platformu je prošao SAMO depozit — keš se ne knjiži.
    const entries = await PaymentLedger.find({}).lean<LedgerRow[]>();
    expect(entries).toHaveLength(1);
    expect(entries[0].amountMinor).toBe(toMinor(DEPOSIT));
    expect(entries[0].account).toBe("salon_payable");

    // Razlika je ono što je salon naplatio direktno.
    const saved = await readAppointment(appt._id);
    expect((saved?.pricing?.chargedAmount ?? 0) - DEPOSIT).toBe(3800);

    // Zarada i dalje ide na ukupno naplaćeno, ne na ono što je prošlo kroz nas.
    const points = await LoyaltyLedger.findOne({ currency: "points" }).lean<{
      amount: number;
    }>();
    expect(points?.amount).toBe(48);
  });
});

// ─── GRANICE ──────────────────────────────────────────────────────────────────

describe("granice", () => {
  it("račun ne sme da vredi manje od naplaćenog depozita", async () => {
    const appt = await seedAppointment();
    await payDeposit(appt._id);

    // Vlasnica greškom ukuca 500, a depozit je već 1.000.
    await expect(
      completeAppointmentCheckout({
        appointmentId: String(appt._id),
        actor,
        amounts: { chargedAmount: 500 },
      }),
    ).rejects.toMatchObject({ code: "INVALID" });

    expect((await readAppointment(appt._id))?.status).toBe("appointment_approved");
  });

  it("termin bez ijedne uplate se ponaša kao i pre", async () => {
    const appt = await seedAppointment();
    const preview = await previewAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
    });
    expect(preview.paidOnline).toBe(0);
    expect(preview.remainingDue).toBe(SERVICE_PRICE);

    // Bez uplata i bez unete cene — i dalje sme da prođe.
    const result = await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor,
    });
    expect(result.status).toBe("completed");
  });

  it("dupli klik na naplatu ne pravi dve namere ni dva knjiženja", async () => {
    const appt = await seedAppointment();
    const first = await payDeposit(appt._id);
    const again = await createPaymentIntent({
      actor,
      appointmentId: String(appt._id),
      clientTenantUserId: String(CLIENT),
      purpose: "appointment_deposit",
      amountMinor: toMinor(DEPOSIT),
      idempotencyKey: `deposit:${String(appt._id)}`,
    });

    expect(again.idempotentReplay).toBe(true);
    expect(again.intentId).toBe(first.intentId);
    expect(await PaymentIntent.countDocuments({})).toBe(1);

    // Ponovno zatvaranje iste namere ne knjiži drugi put.
    const replay = await settlePaymentIntent({
      actor,
      intentId: first.intentId,
      description: "Depozit — ponovljen pokušaj",
    });
    expect(replay.idempotentReplay).toBe(true);
    expect(await PaymentLedger.countDocuments({})).toBe(1);
  });

  it("dva paralelna zatvaranja iste namere → jedno knjiženje", async () => {
    const appt = await seedAppointment();
    const intent = await createPaymentIntent({
      actor,
      appointmentId: String(appt._id),
      purpose: "appointment_deposit",
      amountMinor: toMinor(DEPOSIT),
      idempotencyKey: `deposit:race:${String(appt._id)}`,
    });

    await Promise.allSettled([
      settlePaymentIntent({ actor, intentId: intent.intentId, description: "Depozit" }),
      settlePaymentIntent({ actor, intentId: intent.intentId, description: "Depozit" }),
    ]);

    expect(await PaymentLedger.countDocuments({})).toBe(1);
    const settlement = await appointmentSettlement({
      tenantId: String(TENANT),
      appointmentId: String(appt._id),
      amountDueMinor: toMinor(SERVICE_PRICE),
    });
    expect(settlement.capturedMinor).toBe(toMinor(DEPOSIT));
  });

  it("depozit se traži uslovno — lojalna klijentkinja ga ne plaća", async () => {
    const config = {
      enabled: true,
      amountMinor: toMinor(DEPOSIT),
      triggers: ["new_client", "previous_no_show"] as const,
      highValueThresholdMinor: null,
    };

    // Nova klijentkinja.
    expect(
      evaluateDeposit({
        config,
        completedVisits: 0,
        noShows: 0,
        appointmentValueMinor: toMinor(SERVICE_PRICE),
        peakSlot: false,
      }).required,
    ).toBe(true);

    // Redovna klijentkinja bez nedolazaka.
    expect(
      evaluateDeposit({
        config,
        completedVisits: 12,
        noShows: 0,
        appointmentValueMinor: toMinor(SERVICE_PRICE),
        peakSlot: false,
      }).required,
    ).toBe(false);
  });
});
