/**
 * T1-4 hardening — četiri concurrency/durability rupe koje zeleni testovi
 * prethodnog reza nisu hvatali.
 *
 * Svaka `describe` grupa odgovara jednom nalazu:
 *   1. server nije sprovodio `requiresAgreedPrice` pri završetku;
 *   2. kupovina je koristila termin i ponudu učitane PRE transakcije;
 *   3. oslobađanje vaučera nije bilo atomsko sa uklanjanjem pogodnosti;
 *   4. finalizacija završetka nije bila durabilna ni popravljiva.
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
import { completeAppointmentCheckout } from "./checkout";
import { finalizeAppointmentCompletion } from "@/lib/loyalty/hooks";
import {
  applyExistingVoucher,
  redeemPointsReward,
  removeBenefit,
  type RedemptionActor,
} from "@/lib/loyalty/redemption";
import { tenantHasFeature } from "@/lib/plans/subscriptionService";
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
const OTHER_SERVICE = new Types.ObjectId();
const ADMIN = new Types.ObjectId();

const OFFER = "psh_hard1";
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
  value: number;
  reservedAppointmentId?: Types.ObjectId | null;
}

const readAppointment = (id: unknown) => Appointment.findById(id).lean<AppointmentRow>();
const readVoucher = (id: unknown) => Voucher.findById(id).lean<VoucherRow>();

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

async function seedConfig(offerOverrides: Record<string, unknown> = {}) {
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
    pointsShop: [
      {
        id: OFFER,
        costPoints: 500,
        reward: { type: "fixed", value: 500, serviceName: "", expiresDays: 30 },
        ...offerOverrides,
      },
    ],
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

/** Vaučer već rezervisan na terminu, kao posle primene pogodnosti. */
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
  await mongoose.connect(replSet.getUri(), { dbName: "checkout-hardening-test" });
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
  vi.mocked(tenantHasFeature).mockResolvedValue(true);
});

/**
 * Ubaci izmenu baze IZMEĐU pred-transakcione provere i same transakcije.
 *
 * `tenantHasFeature` (plan/capability) je namerno jedina stvar koja se rešava
 * pre transakcije, pa je to tačna tačka preseka: sve što se posle nje promeni
 * transakcija MORA da vidi. Bez ovog interleave-a test bi dokazivao samo da se
 * podaci čitaju sveže, a ne da se čitaju u transakciji.
 */
function mutateBetweenPreCheckAndTransaction(mutate: () => Promise<unknown>) {
  vi.mocked(tenantHasFeature).mockImplementationOnce(async () => {
    await mutate();
    return true;
  });
}

// ─── 1. AGREED PRICE JE SERVER INVARIANT ──────────────────────────────────────

describe("1. završetak traži potvrđenu pre-benefit cenu", () => {
  it("`on_request` + vaučer bez dogovorene cene → INVALID, ništa se ne menja", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "on_request", baseAmount: null, minimumTotal: null }),
    });
    const voucher = await attachVoucher(appt._id);

    await expect(
      completeAppointmentCheckout({
        appointmentId: String(appt._id),
        actor: adminCheckout,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });

    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("appointment_approved");
    expect(String(saved?.appliedVoucherId)).toBe(String(voucher._id));
    expect((await readVoucher(voucher._id))?.status).toBe("reserved");
    expect(await LoyaltyEvent.countDocuments({})).toBe(0);
  });

  it("`from` + vaučer sa samo `minimumTotal` → INVALID; minimum nije dogovor", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "from", baseAmount: 2000, minimumTotal: 2000 }),
    });
    await attachVoucher(appt._id);

    await expect(
      completeAppointmentCheckout({
        appointmentId: String(appt._id),
        actor: adminCheckout,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });

    expect((await readAppointment(appt._id))?.status).toBe("appointment_approved");
  });

  it("sa dogovorenom cenom prolazi i popust se obračuna", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "on_request", baseAmount: null, minimumTotal: null }),
    });
    await attachVoucher(appt._id);

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { agreedPrice: 4000 },
    });

    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("completed");
    expect(saved?.pricing?.quotedTotal).toBe(4000);
    expect(saved?.discountAmount).toBe(800);
    expect(saved?.finalPrice).toBe(3200);
  });

  it("fiksna poznata cena + vaučer ne traži dodatnu potvrdu", async () => {
    const appt = await seedAppointment();
    await attachVoucher(appt._id);

    const result = await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
    });
    expect(result.status).toBe("completed");
    expect(result.discountAmount).toBe(800);
  });

  it("bez pogodnosti nepoznata cena i dalje sme da prođe", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "on_request", baseAmount: null, minimumTotal: null }),
    });
    const result = await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
    });
    expect(result.status).toBe("completed");
  });

  it("vaučer koji je u istom koraku otpao ne traži potvrdu cene", async () => {
    // Usluga je van scope-a → pogodnost pada, pa nema šta da se obračuna.
    const appt = await seedAppointment({
      pricing: pricing({ mode: "on_request", baseAmount: null, minimumTotal: null }),
    });
    const voucher = await attachVoucher(appt._id, {
      type: "fixed",
      value: 500,
      serviceScope: [OTHER_SERVICE],
    });

    const result = await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
    });
    expect(result.status).toBe("completed");
    const saved = await readAppointment(appt._id);
    expect(saved?.appliedVoucherId).toBeUndefined();
    expect((await readVoucher(voucher._id))?.status).toBe("active");
  });

  it("auto-complete ne završava termin koji traži ljudsku cenu", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "on_request", baseAmount: null, minimumTotal: null }),
    });
    const voucher = await attachVoucher(appt._id);

    await expect(
      completeAppointmentCheckout({
        appointmentId: String(appt._id),
        actor: { tenantId: String(TENANT) },
        source: "auto",
        expectedFromStatus: "appointment_approved",
      }),
    ).rejects.toMatchObject({ code: "INVALID" });

    // Ne izmišlja cenu i NE skida pogodnost — ostavlja termin vlasnici.
    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("appointment_approved");
    expect(saved?.pricing?.quotedTotal).toBeNull();
    expect(String(saved?.appliedVoucherId)).toBe(String(voucher._id));
  });
});

// ─── 2. AUTORITATIVNO ČITANJE U TRANSAKCIJI ───────────────────────────────────

describe("2. mutable stanje se čita ponovo u transakciji", () => {
  it("ponuda obrisana POSLE pred-provere → kupovina pada, poeni ostaju", async () => {
    await LoyaltyAccount.create({
      tenantId: TENANT,
      tenantUserId: CLIENT,
      pointsBalance: 500,
    });
    const appt = await seedAppointment();

    mutateBetweenPreCheckAndTransaction(() =>
      LoyaltyConfig.updateOne({ tenantId: TENANT }, { $set: { pointsShop: [] } }),
    );

    await expect(
      redeemPointsReward({
        appointmentId: String(appt._id),
        offerId: OFFER,
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });

    const account = await LoyaltyAccount.findOne({ tenantUserId: CLIENT }).lean<{
      pointsBalance: number;
    }>();
    expect(account?.pointsBalance).toBe(500);
    expect(await LoyaltyLedger.countDocuments({})).toBe(0);
    expect(await Voucher.countDocuments({})).toBe(0);
  });

  it("cena ponude promenjena POSLE pred-provere → naplaćuje se NOVA cena", async () => {
    await LoyaltyAccount.create({
      tenantId: TENANT,
      tenantUserId: CLIENT,
      pointsBalance: 1000,
    });
    const appt = await seedAppointment();

    mutateBetweenPreCheckAndTransaction(() =>
      LoyaltyConfig.updateOne(
        { tenantId: TENANT, "pointsShop.id": OFFER },
        { $set: { "pointsShop.$.costPoints": 700, "pointsShop.$.reward.value": 300 } },
      ),
    );

    await redeemPointsReward({
      appointmentId: String(appt._id),
      offerId: OFFER,
      actor: clientActor,
    });

    // Stara ponuda je bila 500 ⭐ → 500 RSD; transakcija je videla novu.
    const entry = await LoyaltyLedger.findOne({ entryType: "redeem" }).lean<{
      amount: number;
    }>();
    expect(entry?.amount).toBe(-700);
    const voucher = await Voucher.findOne({ origin: "points_shop" }).lean<VoucherRow>();
    expect(voucher?.value).toBe(300);
  });

  it("poeni isključeni POSLE pred-provere → kupovina pada", async () => {
    await LoyaltyAccount.create({
      tenantId: TENANT,
      tenantUserId: CLIENT,
      pointsBalance: 500,
    });
    const appt = await seedAppointment();

    mutateBetweenPreCheckAndTransaction(() =>
      LoyaltyConfig.updateOne(
        { tenantId: TENANT },
        { $set: { "currencies.points.enabled": false } },
      ),
    );

    await expect(
      redeemPointsReward({
        appointmentId: String(appt._id),
        offerId: OFFER,
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await LoyaltyLedger.countDocuments({})).toBe(0);
  });

  it("termin završen POSLE pred-provere → kupovina se odbija, saldo netaknut", async () => {
    await LoyaltyAccount.create({
      tenantId: TENANT,
      tenantUserId: CLIENT,
      pointsBalance: 500,
    });
    const appt = await seedAppointment();

    mutateBetweenPreCheckAndTransaction(() =>
      Appointment.updateOne({ _id: appt._id }, { $set: { status: "completed" } }),
    );

    await expect(
      redeemPointsReward({
        appointmentId: String(appt._id),
        offerId: OFFER,
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });

    expect(await LoyaltyLedger.countDocuments({})).toBe(0);
    const account = await LoyaltyAccount.findOne({ tenantUserId: CLIENT }).lean<{
      pointsBalance: number;
    }>();
    expect(account?.pointsBalance).toBe(500);
  });

  it("usluga promenjena POSLE pred-provere → scope se proverava nad novom", async () => {
    await LoyaltyAccount.create({
      tenantId: TENANT,
      tenantUserId: CLIENT,
      pointsBalance: 500,
    });
    const appt = await seedAppointment();
    // Nagrada važi samo za SERVICE; termin se u međuvremenu prebacuje na drugu.
    await LoyaltyConfig.updateOne(
      { tenantId: TENANT, "pointsShop.id": OFFER },
      { $set: { "pointsShop.$.reward.serviceId": SERVICE } },
    );

    mutateBetweenPreCheckAndTransaction(() =>
      Appointment.updateOne(
        { _id: appt._id },
        { $set: { "services.0.serviceId": OTHER_SERVICE } },
      ),
    );

    await expect(
      redeemPointsReward({
        appointmentId: String(appt._id),
        offerId: OFFER,
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });
    expect(await LoyaltyLedger.countDocuments({})).toBe(0);
  });

  it("pogodnost dodata POSLE pred-provere → druga se odbija (409)", async () => {
    await LoyaltyAccount.create({
      tenantId: TENANT,
      tenantUserId: CLIENT,
      pointsBalance: 500,
    });
    const appt = await seedAppointment();

    mutateBetweenPreCheckAndTransaction(async () => {
      await attachVoucher(appt._id);
    });

    await expect(
      redeemPointsReward({
        appointmentId: String(appt._id),
        offerId: OFFER,
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await LoyaltyLedger.countDocuments({})).toBe(0);
  });

  it("vaučer: usluga promenjena van scope-a POSLE pred-provere → odbijeno", async () => {
    const appt = await seedAppointment();
    const voucher = await seedVoucher({
      type: "fixed",
      value: 500,
      serviceScope: [SERVICE],
    });

    mutateBetweenPreCheckAndTransaction(() =>
      Appointment.updateOne(
        { _id: appt._id },
        { $set: { "services.0.serviceId": OTHER_SERVICE } },
      ),
    );

    await expect(
      applyExistingVoucher({
        appointmentId: String(appt._id),
        voucherId: String(voucher._id),
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });

    expect((await readVoucher(voucher._id))?.status).toBe("active");
  });

  it("vaučer: termin završen POSLE pred-provere → primena se odbija", async () => {
    const appt = await seedAppointment();
    const voucher = await seedVoucher();

    mutateBetweenPreCheckAndTransaction(() =>
      Appointment.updateOne({ _id: appt._id }, { $set: { status: "completed" } }),
    );

    await expect(
      applyExistingVoucher({
        appointmentId: String(appt._id),
        voucherId: String(voucher._id),
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });

    expect((await readVoucher(voucher._id))?.status).toBe("active");
  });

  it("uklanjanje: završen termin ne daje pogodnost nazad", async () => {
    // `removeBenefit` nema pred-transakcioni capability poziv, pa se ovde ne
    // može ubaciti isti interleave. Transakcionu ogradu (`openAppointmentFilter`
    // + provera statusa nad čitanjem u sesiji) dokazuje test „termin završen
    // POSLE pred-provere" iznad — ista ograda, isti helper.
    const appt = await seedAppointment();
    const voucher = await attachVoucher(appt._id);
    await Appointment.updateOne({ _id: appt._id }, { $set: { status: "completed" } });

    await expect(
      removeBenefit({ appointmentId: String(appt._id), actor: clientActor }),
    ).rejects.toMatchObject({ code: "INVALID" });

    const saved = await readAppointment(appt._id);
    expect(String(saved?.appliedVoucherId)).toBe(String(voucher._id));
    expect((await readVoucher(voucher._id))?.status).toBe("reserved");
  });
});

// ─── 3. OSLOBAĐANJE JE ATOMSKO SA UKLANJANJEM ─────────────────────────────────

describe("3. oslobađanje vaučera je atomsko sa upisom termina", () => {
  it("pad upisa termina NE oslobađa vaučer (nema split stanja)", async () => {
    const appt = await seedAppointment({
      pricing: pricing({ mode: "on_request", baseAmount: null, minimumTotal: null }),
    });
    const voucher = await attachVoucher(appt._id, {
      type: "fixed",
      value: 500,
      serviceScope: [OTHER_SERVICE],
    });

    // Upis termina puca usred transakcije u kojoj se vaučer oslobađa.
    vi.spyOn(Appointment, "findOneAndUpdate").mockImplementationOnce((() => {
      throw new Error("simulirani pad upisa termina");
    }) as typeof Appointment.findOneAndUpdate);

    await expect(
      completeAppointmentCheckout({
        appointmentId: String(appt._id),
        actor: adminCheckout,
      }),
    ).rejects.toThrow();

    // Oba dokumenta su ostala kakva su bila: nema termina bez pogodnosti sa
    // vaučerom koji je i dalje zaključan, ni obrnuto.
    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("appointment_approved");
    expect(String(saved?.appliedVoucherId)).toBe(String(voucher._id));
    expect((await readVoucher(voucher._id))?.status).toBe("reserved");
  });

  it("uspešan `released` plan oslobađa vaučer I čisti termin", async () => {
    const appt = await seedAppointment();
    const voucher = await attachVoucher(appt._id, {
      type: "fixed",
      value: 500,
      serviceScope: [OTHER_SERVICE],
    });

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 4000 },
    });

    const saved = await readAppointment(appt._id);
    expect(saved?.appliedVoucherId).toBeUndefined();
    expect(saved?.discountAmount).toBeUndefined();
    const after = await readVoucher(voucher._id);
    expect(after?.status).toBe("active");
    expect(after?.reservedAppointmentId).toBeFalsy();
  });

  it("uklanjanje pogodnosti ostavlja poene potrošenim, ali bez split stanja", async () => {
    await LoyaltyAccount.create({
      tenantId: TENANT,
      tenantUserId: CLIENT,
      pointsBalance: 500,
    });
    const appt = await seedAppointment();
    const bought = await redeemPointsReward({
      appointmentId: String(appt._id),
      offerId: OFFER,
      actor: clientActor,
    });

    await removeBenefit({ appointmentId: String(appt._id), actor: clientActor });

    const saved = await readAppointment(appt._id);
    expect(saved?.appliedVoucherId).toBeUndefined();
    const voucher = await readVoucher(bought.voucherId);
    expect(voucher?.status).toBe("active");
    expect(voucher?.reservedAppointmentId).toBeFalsy();
    const account = await LoyaltyAccount.findOne({ tenantUserId: CLIENT }).lean<{
      pointsBalance: number;
    }>();
    expect(account?.pointsBalance).toBe(0);
  });
});

// ─── 4. DURABILNA FINALIZACIJA ZAVRŠETKA ──────────────────────────────────────

describe("4. finalizacija završetka je durabilna i popravljiva", () => {
  it("pad upisa događaja ostavlja termin NEfinalizovanim, ne lažno gotovim", async () => {
    const appt = await seedAppointment();
    const voucher = await attachVoucher(appt._id);

    vi.spyOn(LoyaltyEvent, "create").mockImplementationOnce((() => {
      throw new Error("simulirani pad upisa događaja");
    }) as typeof LoyaltyEvent.create);

    // Termin JESTE završen — loyalty ne sme da sruši taj ishod...
    const result = await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    expect(result.status).toBe("completed");

    // ...ali zastavica NE sme da tvrdi da je obrada gotova.
    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("completed");
    expect(saved?.loyaltyProcessed?.completed).not.toBe(true);
    expect(await LoyaltyEvent.countDocuments({})).toBe(0);
    // Vaučer je ipak iskorišćen (korak 1 je prošao) — idempotentno.
    expect((await readVoucher(voucher._id))?.status).toBe("redeemed");
  });

  it("ponovni checkout POPRAVLJA nedovršenu finalizaciju bez duple zarade", async () => {
    const appt = await seedAppointment();
    await attachVoucher(appt._id);

    vi.spyOn(LoyaltyEvent, "create").mockImplementationOnce((() => {
      throw new Error("simulirani pad upisa događaja");
    }) as typeof LoyaltyEvent.create);
    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    expect(await LoyaltyEvent.countDocuments({})).toBe(0);

    vi.restoreAllMocks();

    // Drugi poziv nad već završenim terminom ne odustaje nego popravlja.
    const retry = await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    expect(retry.alreadyCompleted).toBe(true);

    const saved = await readAppointment(appt._id);
    expect(saved?.loyaltyProcessed?.completed).toBe(true);
    expect(
      await LoyaltyEvent.countDocuments({ type: "appointment_completed" }),
    ).toBe(1);

    // Zarada je proknjižena tačno jednom.
    const hearts = await LoyaltyLedger.countDocuments({ currency: "hearts" });
    expect(hearts).toBe(1);
    const points = await LoyaltyLedger.findOne({ currency: "points" }).lean<{
      amount: number;
    }>();
    expect(points?.amount).toBe(32);
  });

  it("pad vaučer koraka ne ostavlja termin lažno finalizovanim", async () => {
    const appt = await seedAppointment();
    const voucher = await attachVoucher(appt._id);

    vi.spyOn(Voucher, "findOneAndUpdate").mockImplementationOnce((() => {
      throw new Error("simulirani pad redeem-a");
    }) as typeof Voucher.findOneAndUpdate);

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });

    const saved = await readAppointment(appt._id);
    expect(saved?.status).toBe("completed");
    expect(saved?.loyaltyProcessed?.completed).not.toBe(true);
    expect((await readVoucher(voucher._id))?.status).toBe("reserved");

    vi.restoreAllMocks();
    await finalizeAppointmentCompletion(appt._id);

    expect((await readVoucher(voucher._id))?.status).toBe("redeemed");
    expect((await readAppointment(appt._id))?.loyaltyProcessed?.completed).toBe(true);
  });

  it("već potpuno finalizovan termin je no-op", async () => {
    const appt = await seedAppointment();
    await attachVoucher(appt._id);

    await completeAppointmentCheckout({
      appointmentId: String(appt._id),
      actor: adminCheckout,
      amounts: { chargedAmount: 3200 },
    });
    const first = await readAppointment(appt._id);
    expect(first?.loyaltyProcessed?.completed).toBe(true);

    const again = await finalizeAppointmentCompletion(appt._id);
    expect(again).toEqual({ finalized: true, alreadyFinalized: true });
    expect(await LoyaltyLedger.countDocuments({ currency: "hearts" })).toBe(1);
    expect(await LoyaltyEvent.countDocuments({})).toBe(1);
  });

  it("nezavršen termin nema šta da finalizuje", async () => {
    const appt = await seedAppointment();
    const res = await finalizeAppointmentCompletion(appt._id);
    expect(res).toEqual({ finalized: false, alreadyFinalized: false });
    expect(await LoyaltyEvent.countDocuments({})).toBe(0);
  });
});
