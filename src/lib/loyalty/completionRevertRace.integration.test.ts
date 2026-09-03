/**
 * T1-4F — dve preostale trke oko završetka termina.
 *
 * A) završetak je ostavio trag (vaučer/durable događaj), ali zastavica
 *    `loyaltyProcessed.completed` još nije postavljena, a revert stiže baš tada;
 * B) checkout je izračunao račun nad jednom pogodnošću, a druga se primeni ili
 *    ukloni pre nego što upiše `completed`.
 *
 * Oba scenarija su nevidljiva unit testovima — traže pravi ReplSet, pravi
 * unique indeks nad događajima i pravo preplitanje.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Appointment } from "@/models/Appointment";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { LoyaltyEvent } from "@/models/LoyaltyEvent";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { Voucher } from "@/models/Voucher";
import { completeAppointmentCheckout } from "@/lib/appointments/checkout";
import {
  finalizeAppointmentCompletion,
  finalizeAppointmentRevert,
} from "./hooks";
import { processLoyaltyEvent } from "./events";
import { applyExistingVoucher, removeBenefit, type RedemptionActor } from "./redemption";
import type { IAppointmentPricing } from "@/types";
import type { LoyaltyEventLean } from "./types";

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

const adminCheckout = { tenantId: String(TENANT), adminTenantUserId: String(ADMIN) };
const clientActor: RedemptionActor = {
  kind: "client",
  tenantId: String(TENANT),
  tenantUserId: String(CLIENT),
};

interface AppointmentRow {
  status: string;
  pricing?: IAppointmentPricing;
  discountAmount?: number;
  finalPrice?: number;
  appliedVoucherId?: Types.ObjectId;
  loyaltyProcessed?: { completed?: boolean; revertCount?: number };
}
interface VoucherRow {
  _id: Types.ObjectId;
  status: string;
  reservedAppointmentId?: Types.ObjectId | null;
}

const readAppointment = (id: unknown) => Appointment.findById(id).lean<AppointmentRow>();
const readVoucher = (id: unknown) => Voucher.findById(id).lean<VoucherRow>();
const pointsSum = async () => {
  const rows = await LoyaltyLedger.aggregate([
    { $match: { currency: "points" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return rows[0]?.total ?? 0;
};
const heartsSum = async () => {
  const rows = await LoyaltyLedger.aggregate([
    { $match: { currency: "hearts" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return rows[0]?.total ?? 0;
};

function pricing(overrides: Partial<IAppointmentPricing> = {}): IAppointmentPricing {
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
    pointsShop: [],
    antiAbuse: { maxHeartsPerDay: 100, maxPointsPerDay: 100000 },
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
    pricing: pricing(),
    date: "2099-01-01",
    time: "10:00",
    duration: 60,
    status: "appointment_approved",
    ...overrides,
  });
}

async function seedVoucher(overrides: Record<string, unknown> = {}) {
  return Voucher.create({
    tenantId: TENANT,
    code: `V-${new Types.ObjectId().toString().slice(-8).toUpperCase()}`,
    type: "percent",
    value: 20,
    serviceScope: [],
    origin: "auto_rule",
    ownerTenantUserId: CLIENT,
    status: "active",
    ...overrides,
  });
}

async function attachVoucher(appointmentId: Types.ObjectId, overrides = {}) {
  const voucher = await seedVoucher({
    status: "reserved",
    reservedAppointmentId: appointmentId,
    ...overrides,
  });
  await Appointment.updateOne(
    { _id: appointmentId },
    { $set: { appliedVoucherId: voucher._id } },
  );
  return voucher;
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri(), { dbName: "completion-revert-race-test" });
  await Promise.all([
    LoyaltyLedger.syncIndexes(),
    LoyaltyEvent.syncIndexes(),
    Voucher.syncIndexes(),
  ]);
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

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── RACE A ───────────────────────────────────────────────────────────────────

describe("A. revert pre nego što je zastavica postavljena", () => {
  it("A1. upis događaja pao → revert i dalje ispravlja vaučer, bez lažne nagrade", async () => {
    const appt = await seedAppointment();
    const voucher = await attachVoucher(appt._id);

    vi.spyOn(LoyaltyEvent, "create").mockImplementationOnce((() => {
      throw new Error("simulirani pad upisa completion događaja");
    }) as typeof LoyaltyEvent.create);

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    vi.restoreAllMocks();

    // Vaučer JESTE iskorišćen (korak 1 prošao), zastavica NIJE postavljena.
    expect((await readVoucher(voucher._id))?.status).toBe("redeemed");
    expect((await readAppointment(appt._id))?.loyaltyProcessed?.completed).not.toBe(true);
    expect(await LoyaltyEvent.countDocuments({})).toBe(0);

    // Admin vraća termin.
    await Appointment.updateOne(
      { _id: appt._id },
      { $set: { status: "appointment_approved" } },
    );
    await finalizeAppointmentRevert(appt._id, "appointment_approved");

    // Vaučer prati NOVI status termina, ne ostaje zaglavljen kao `redeemed`.
    const after = await readVoucher(voucher._id);
    expect(after?.status).toBe("reserved");
    expect(String(after?.reservedAppointmentId)).toBe(String(appt._id));

    const saved = await readAppointment(appt._id);
    expect(saved?.loyaltyProcessed?.completed).not.toBe(true);
    // Nagrade nije ni bilo, pa nema šta da se poništava.
    expect(await heartsSum()).toBe(0);
    expect(await pointsSum()).toBe(0);
  });

  it("A2. durable completion postoji, zastavica ne → revert kompenzuje tačno jednom", async () => {
    const appt = await seedAppointment();
    const voucher = await attachVoucher(appt._id);

    // Završetak prođe do kraja, pa se zastavica ručno vrati na false —
    // tačno stanje „događaj postoji, finalizacija nije zaključena".
    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    await Appointment.updateOne(
      { _id: appt._id },
      { $set: { "loyaltyProcessed.completed": false } },
    );

    await Appointment.updateOne(
      { _id: appt._id },
      { $set: { status: "appointment_cancelled" } },
    );
    const first = await finalizeAppointmentRevert(appt._id, "appointment_cancelled");
    expect(first.compensated).toBe(true);

    expect(
      await LoyaltyEvent.countDocuments({ type: "appointment_completion_reverted" }),
    ).toBe(1);
    expect((await readVoucher(voucher._id))?.status).toBe("active");

    const saved = await readAppointment(appt._id);
    expect(saved?.loyaltyProcessed?.revertCount).toBe(1);
    expect(saved?.loyaltyProcessed?.completed).toBe(false);

    // Neto zarada je poništena.
    expect(await heartsSum()).toBe(0);
    expect(await pointsSum()).toBe(0);

    // Ponovljen revert ne kompenzuje drugi put.
    await finalizeAppointmentRevert(appt._id, "appointment_cancelled");
    expect(
      await LoyaltyEvent.countDocuments({ type: "appointment_completion_reverted" }),
    ).toBe(1);
    expect((await readAppointment(appt._id))?.loyaltyProcessed?.revertCount).toBe(1);
    expect(await heartsSum()).toBe(0);
  });

  it("A3. zastareo completion događaj NE nagrađuje vraćen termin", async () => {
    const appt = await seedAppointment();
    await attachVoucher(appt._id);

    // Završetak upiše događaj, ali obrada padne → ostaje `failed` za sweeper.
    const spy = vi
      .spyOn(LoyaltyAccount, "findByIdAndUpdate")
      .mockImplementationOnce((() => {
        throw new Error("simulirani pad obrade");
      }) as typeof LoyaltyAccount.findByIdAndUpdate);

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    spy.mockRestore();

    const stale = await LoyaltyEvent.findOne({
      type: "appointment_completed",
    }).lean<LoyaltyEventLean>();
    expect(stale).toBeTruthy();

    // Termin se vraća PRE nego što sweeper stigne do događaja.
    await Appointment.updateOne(
      { _id: appt._id },
      { $set: { status: "appointment_cancelled" } },
    );
    await finalizeAppointmentRevert(appt._id, "appointment_cancelled");

    await LoyaltyLedger.deleteMany({});

    // Snimi stanje PRE obrade zastarelog događaja. Informativni brojači
    // (`completedVisits`, `totalSpend`) su poznato slabije stanje van ledger
    // zaštite i T1-4F ih ne popravlja — meri se da ih zastareo događaj NE
    // POMERA, ne kolika im je apsolutna vrednost.
    const before = await LoyaltyAccount.findOne({ tenantUserId: CLIENT }).lean<{
      completedVisits?: number;
      totalSpend?: number;
      currentStreak?: number;
    }>();
    const vouchersBefore = await Voucher.countDocuments({});

    // Sweeper sada obrađuje zastareli događaj.
    const config = await LoyaltyConfig.findOne({ tenantId: TENANT }).lean();
    await processLoyaltyEvent(stale!, config as never);

    // Nijedna nagrada ne sme da nastane.
    expect(await LoyaltyLedger.countDocuments({})).toBe(0);
    expect(await Voucher.countDocuments({})).toBe(vouchersBefore);

    const after = await LoyaltyAccount.findOne({ tenantUserId: CLIENT }).lean<{
      completedVisits?: number;
      totalSpend?: number;
      currentStreak?: number;
    }>();
    expect(after?.completedVisits ?? 0).toBe(before?.completedVisits ?? 0);
    expect(after?.totalSpend ?? 0).toBe(before?.totalSpend ?? 0);
    expect(after?.currentStreak ?? 0).toBe(before?.currentStreak ?? 0);

    // Događaj je razrešen, ne kruži zauvek kroz sweeper.
    const settled = await LoyaltyEvent.findById(stale!._id).lean<{ status: string }>();
    expect(["processed", "skipped"]).toContain(settled?.status);
  });

  it("A4. obrađen completion → revert poništava neto zaradu tačno jednom", async () => {
    const appt = await seedAppointment();
    await attachVoucher(appt._id);

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    expect(await heartsSum()).toBe(1);
    expect(await pointsSum()).toBe(32);

    // Zastavica se vraća — završetak je obrađen, finalizacija „nije zaključena".
    await Appointment.updateOne(
      { _id: appt._id },
      { $set: { "loyaltyProcessed.completed": false, status: "no_show" } },
    );

    await finalizeAppointmentRevert(appt._id, "no_show");
    expect(await heartsSum()).toBe(0);
    expect(await pointsSum()).toBe(0);

    // Ponovljen revert ne kompenzuje drugi put.
    await finalizeAppointmentRevert(appt._id, "no_show");
    expect(await heartsSum()).toBe(0);
    expect(await pointsSum()).toBe(0);
  });

  it("A5. potpuno finalizovan završetak → revert i dalje radi kao pre", async () => {
    const appt = await seedAppointment();
    const voucher = await attachVoucher(appt._id);

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    expect((await readAppointment(appt._id))?.loyaltyProcessed?.completed).toBe(true);
    expect((await readVoucher(voucher._id))?.status).toBe("redeemed");

    await Appointment.updateOne(
      { _id: appt._id },
      { $set: { status: "appointment_approved" } },
    );
    await finalizeAppointmentRevert(appt._id, "appointment_approved");

    expect((await readVoucher(voucher._id))?.status).toBe("reserved");
    const saved = await readAppointment(appt._id);
    expect(saved?.loyaltyProcessed?.completed).toBe(false);
    expect(saved?.loyaltyProcessed?.revertCount).toBe(1);
    expect(await heartsSum()).toBe(0);
    expect(await pointsSum()).toBe(0);
  });

  it("pad upisa revert događaja ostavlja ciklus netaknut za retry", async () => {
    const appt = await seedAppointment();
    await attachVoucher(appt._id);
    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    await Appointment.updateOne(
      { _id: appt._id },
      { $set: { status: "appointment_cancelled" } },
    );

    vi.spyOn(LoyaltyEvent, "create").mockImplementationOnce((() => {
      throw new Error("simulirani pad upisa revert događaja");
    }) as typeof LoyaltyEvent.create);

    await expect(
      finalizeAppointmentRevert(appt._id, "appointment_cancelled"),
    ).rejects.toThrow();

    // KLJUČNO: brojač se NIJE pomerio, pa retry pravi ISTI revert identitet.
    const stuck = await readAppointment(appt._id);
    expect(stuck?.loyaltyProcessed?.revertCount ?? 0).toBe(0);
    vi.restoreAllMocks();

    await finalizeAppointmentRevert(appt._id, "appointment_cancelled");
    const events = await LoyaltyEvent.find({
      type: "appointment_completion_reverted",
    }).lean<{ sourceId: string }[]>();
    expect(events).toHaveLength(1);
    expect(events[0].sourceId).toBe(`${String(appt._id)}:r1`);
    expect((await readAppointment(appt._id))?.loyaltyProcessed?.revertCount).toBe(1);
  });

  it("završetak bez ijednog traga ne pravi kompenzaciju", async () => {
    const appt = await seedAppointment({ status: "appointment_cancelled" });
    const res = await finalizeAppointmentRevert(appt._id, "appointment_cancelled");
    expect(res.compensated).toBe(false);
    expect(await LoyaltyEvent.countDocuments({})).toBe(0);
    expect((await readAppointment(appt._id))?.loyaltyProcessed?.revertCount ?? 0).toBe(0);
  });

  it("drugi ciklus završetka posle reverta nosi svoj identitet", async () => {
    const appt = await seedAppointment();
    await attachVoucher(appt._id);
    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    await Appointment.updateOne(
      { _id: appt._id },
      { $set: { status: "appointment_approved" } },
    );
    await finalizeAppointmentRevert(appt._id, "appointment_approved");

    // Ponovni završetak → ciklus 1.
    await Appointment.updateOne({ _id: appt._id }, { $set: { status: "completed" } });
    await finalizeAppointmentCompletion(appt._id);

    const ids = (
      await LoyaltyEvent.find({}).select("sourceId").lean<{ sourceId: string }[]>()
    ).map((e) => e.sourceId);
    const id = String(appt._id);
    expect(ids).toContain(`${id}:c0`);
    expect(ids).toContain(`${id}:r1`);
    expect(ids).toContain(`${id}:c1`);
    // Drugi ciklus ponovo nagrađuje — to je postojeće, željeno ponašanje.
    expect(await heartsSum()).toBe(1);
  });
});

// ─── RACE B ───────────────────────────────────────────────────────────────────

describe("B. checkout mora da CAS-uje pogodnost nad kojom je računao", () => {
  it("B1. pogodnost dodata posle čitanja → 409, termin nije završen", async () => {
    const appt = await seedAppointment();
    const voucher = await seedVoucher();

    // Checkout je termin video BEZ pogodnosti...
    expect((await readAppointment(appt._id))?.appliedVoucherId).toBeUndefined();

    // ...a pogodnost se primeni pre nego što upiše `completed`.
    await applyExistingVoucher({
      appointmentId: String(appt._id),
      voucherId: String(voucher._id),
      actor: clientActor,
    });

    // Checkout koji je „video" termin bez pogodnosti sada pokušava upis.
    await expect(
      completeAppointmentCheckoutWithStaleBenefit(appt._id, undefined),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("appointment_approved");
    expect(String(saved?.appliedVoucherId)).toBe(String(voucher._id));
    expect((await readVoucher(voucher._id))?.status).toBe("reserved");
  });

  it("B2. pogodnost uklonjena posle čitanja → 409, vaučer ostaje aktivan", async () => {
    const appt = await seedAppointment();
    const voucher = await attachVoucher(appt._id);

    await removeBenefit({ appointmentId: String(appt._id), actor: clientActor });

    await expect(
      completeAppointmentCheckoutWithStaleBenefit(appt._id, voucher._id),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("appointment_approved");
    expect(saved?.appliedVoucherId).toBeUndefined();
    expect(saved?.discountAmount).toBeUndefined();
    expect((await readVoucher(voucher._id))?.status).toBe("active");
  });

  it("B3. V1 zamenjen sa V2 → 409, nijedan vaučer nije pogrešno oslobođen", async () => {
    const appt = await seedAppointment();
    const v1 = await attachVoucher(appt._id);
    await removeBenefit({ appointmentId: String(appt._id), actor: clientActor });
    const v2 = await seedVoucher({ type: "fixed", value: 500 });
    await applyExistingVoucher({
      appointmentId: String(appt._id),
      voucherId: String(v2._id),
      actor: clientActor,
    });

    await expect(
      completeAppointmentCheckoutWithStaleBenefit(appt._id, v1._id),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect((await readVoucher(v1._id))?.status).toBe("active");
    expect((await readVoucher(v2._id))?.status).toBe("reserved");
    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("appointment_approved");
    expect(String(saved?.appliedVoucherId)).toBe(String(v2._id));
  });

  it("B4. bez konkurentne izmene checkout prolazi normalno", async () => {
    const appt = await seedAppointment();
    const voucher = await attachVoucher(appt._id);

    const result = await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });

    expect(result.status).toBe("completed");
    expect(result.discountAmount).toBe(800);
    expect((await readVoucher(voucher._id))?.status).toBe("redeemed");
  });
});

/**
 * Checkout koji je račun izračunao nad ZASTARELIM stanjem pogodnosti.
 *
 * `completeAppointmentCheckout` sam učitava termin, pa se zastarelo stanje ne
 * može proslediti spolja. Simulira se tako što se prvo čitanje termina vrati
 * sa `appliedVoucherId` kakav je bio u trenutku pravljenja računa — dalje sve
 * ide kroz pravi kod, uključujući CAS pri upisu.
 */
async function completeAppointmentCheckoutWithStaleBenefit(
  appointmentId: Types.ObjectId,
  staleVoucherId: Types.ObjectId | undefined,
) {
  const realFindOne = Appointment.findOne.bind(Appointment);
  let first = true;
  vi.spyOn(Appointment, "findOne").mockImplementation(((...args: unknown[]) => {
    const query = (realFindOne as (...a: unknown[]) => unknown)(...args) as {
      select: (f: string) => { lean: <T>() => Promise<T> };
    };
    if (!first) return query as never;
    first = false;
    return {
      select: (fields: string) => ({
        lean: async () => {
          const doc = (await query.select(fields).lean()) as AppointmentRow | null;
          if (!doc) return doc;
          return { ...doc, appliedVoucherId: staleVoucherId };
        },
      }),
    } as never;
  }) as typeof Appointment.findOne);

  try {
    return await completeAppointmentCheckout({
      appointmentId: String(appointmentId),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
  } finally {
    vi.restoreAllMocks();
  }
}
