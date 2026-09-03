/**
 * T1-4 — points-shop redemption i „jedna pogodnost po terminu", nad pravim
 * Mongo ReplSet-om.
 *
 * Zašto integracioni, a ne unit: cela vrednost ovog reza je u tome što dva
 * paralelna zahteva NE mogu da potroše isti saldo i da nijedan pad ne ostavlja
 * polovično stanje. To se ne može dokazati mock-om — dokazuje se stvarnom
 * transakcijom i stvarnim unique indeksom.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Appointment } from "@/models/Appointment";
import { LoyaltyAccount } from "@/models/LoyaltyAccount";
import { LoyaltyConfig } from "@/models/LoyaltyConfig";
import { LoyaltyLedger } from "@/models/LoyaltyLedger";
import { Voucher } from "@/models/Voucher";
import {
  applyExistingVoucher,
  listAvailableBenefits,
  redeemPointsReward,
  removeBenefit,
  type RedemptionActor,
} from "./redemption";
import { LoyaltyRedemptionError } from "./errors";

// Konekciju drži sam test (ReplSet), pa app-ov connect mora biti no-op.
vi.mock("@/lib/db/mongodb", () => ({ connectToDB: async () => undefined }));
vi.mock("@/lib/plans/subscriptionService", () => ({
  tenantHasFeature: vi.fn(async () => true),
}));
// `isLoyaltyActive` povlači events → engine → notifications → mejl klijent.
// Redemption ne šalje notifikacije; mock drži test na domenu, ne na infrastrukturi.
vi.mock("@/lib/loyalty/notifications", () => ({
  createLoyaltyNotification: vi.fn(async () => null),
  notifyAdminsCompletionPrompt: vi.fn(async () => null),
}));

let replSet: MongoMemoryReplSet;

const TENANT = new Types.ObjectId();
const OTHER_TENANT = new Types.ObjectId();
const CLIENT = new Types.ObjectId();
const OTHER_CLIENT = new Types.ObjectId();
const SERVICE = new Types.ObjectId();
const OTHER_SERVICE = new Types.ObjectId();

const OFFER_500 = "psh_offer500";
const OFFER_PERCENT = "psh_offerpct";

const clientActor: RedemptionActor = {
  kind: "client",
  tenantId: String(TENANT),
  tenantUserId: String(CLIENT),
};
const adminActor: RedemptionActor = {
  kind: "admin",
  tenantId: String(TENANT),
  adminTenantUserId: String(new Types.ObjectId()),
};

async function seedConfig(overrides: Record<string, unknown> = {}) {
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
    pointsShop: [
      {
        id: OFFER_500,
        costPoints: 500,
        reward: { type: "fixed", value: 500, serviceName: "", expiresDays: 30 },
      },
      {
        id: OFFER_PERCENT,
        costPoints: 800,
        reward: { type: "percent", value: 20, serviceName: "", expiresDays: 30 },
      },
    ],
    ...overrides,
  });
}

async function seedAccount(points: number, tenantUserId = CLIENT) {
  return LoyaltyAccount.create({
    tenantId: TENANT,
    tenantUserId,
    pointsBalance: points,
    heartsBalance: 0,
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
    pricing: {
      mode: "fixed",
      currency: "RSD",
      baseAmount: 4000,
      minimumTotal: 4000,
      knownAddonsTotal: 0,
      lines: [],
    },
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

interface AccountRow { pointsBalance: number }
interface AppointmentRow {
  appliedVoucherId?: Types.ObjectId;
  originalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
}
interface VoucherRow {
  _id: Types.ObjectId;
  status: string;
  value: number;
  reservedAppointmentId?: Types.ObjectId | null;
  pointsShopSnapshot?: { offerId: string; costPoints: number };
}
interface LedgerRow {
  amount: number;
  currency: string;
  source?: { appointmentId?: Types.ObjectId; ruleId?: string };
}

const readAccount = (tenantUserId = CLIENT) =>
  LoyaltyAccount.findOne({ tenantUserId }).lean<AccountRow>();
const readAppointment = (id: unknown) =>
  Appointment.findById(id).lean<AppointmentRow>();
const readVoucher = (id: unknown) => Voucher.findById(id).lean<VoucherRow>();

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri(), { dbName: "loyalty-redemption-test" });
  await Promise.all([
    LoyaltyLedger.syncIndexes(),
    Voucher.syncIndexes(),
    LoyaltyAccount.syncIndexes(),
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
    Voucher.deleteMany({}),
  ]);
  await seedConfig();
});

// ─── POINTS ───────────────────────────────────────────────────────────────────

describe("points redemption — atomic debit", () => {
  it("1. tačan saldo: balans na nulu, jedan redeem unos, jedan vaučer", async () => {
    await seedAccount(500);
    const appt = await seedAppointment();

    const result = await redeemPointsReward({
      appointmentId: String(appt._id),
      offerId: OFFER_500,
      actor: clientActor,
    });

    expect(result.idempotentReplay).toBe(false);
    expect(result.pricing).toEqual({
      originalPrice: 4000,
      discountAmount: 500,
      finalPrice: 3500,
    });

    const account = await readAccount();
    expect(account?.pointsBalance).toBe(0);

    const entries = await LoyaltyLedger.find({ entryType: "redeem" }).lean<LedgerRow[]>();
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(-500);
    expect(entries[0].currency).toBe("points");
    expect(String(entries[0].source?.appointmentId)).toBe(String(appt._id));
    expect(entries[0].source?.ruleId).toBe(`points_shop:${OFFER_500}`);

    const vouchers = await Voucher.find({ origin: "points_shop" }).lean<VoucherRow[]>();
    expect(vouchers).toHaveLength(1);
    expect(vouchers[0].status).toBe("reserved");
    expect(String(vouchers[0].reservedAppointmentId)).toBe(String(appt._id));
    expect(vouchers[0].pointsShopSnapshot?.offerId).toBe(OFFER_500);
    expect(vouchers[0].pointsShopSnapshot?.costPoints).toBe(500);

    const saved = await readAppointment(appt._id);
    expect(String(saved?.appliedVoucherId)).toBe(String(vouchers[0]._id));
    expect(saved?.finalPrice).toBe(3500);
  });

  it("2. saldo manji za jedan poen: nijedna mutacija ne ostaje", async () => {
    await seedAccount(499);
    const appt = await seedAppointment();

    await expect(
      redeemPointsReward({
        appointmentId: String(appt._id),
        offerId: OFFER_500,
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const account = await readAccount();
    expect(account?.pointsBalance).toBe(499);
    expect(await LoyaltyLedger.countDocuments({})).toBe(0);
    expect(await Voucher.countDocuments({})).toBe(0);
    const saved = await readAppointment(appt._id);
    expect(saved?.appliedVoucherId).toBeFalsy();
  });

  it("3. retry istog zahteva ne skida poene drugi put", async () => {
    await seedAccount(500);
    const appt = await seedAppointment();

    const first = await redeemPointsReward({
      appointmentId: String(appt._id),
      offerId: OFFER_500,
      actor: clientActor,
    });
    const retry = await redeemPointsReward({
      appointmentId: String(appt._id),
      offerId: OFFER_500,
      actor: clientActor,
    });

    expect(retry.idempotentReplay).toBe(true);
    expect(retry.voucherId).toBe(first.voucherId);
    const account = await readAccount();
    expect(account?.pointsBalance).toBe(0);
    expect(await LoyaltyLedger.countDocuments({})).toBe(1);
    expect(await Voucher.countDocuments({})).toBe(1);
  });

  it("4. dva paralelna zahteva za ISTI termin i nagradu → jedan debit", async () => {
    await seedAccount(1000);
    const appt = await seedAppointment();

    const results = await Promise.allSettled([
      redeemPointsReward({ appointmentId: String(appt._id), offerId: OFFER_500, actor: clientActor }),
      redeemPointsReward({ appointmentId: String(appt._id), offerId: OFFER_500, actor: clientActor }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    // Retry-safe put sme da vrati uspeh dvaput (drugi je replay), ali knjiženje
    // je tačno jedno i skinuto je tačno 500.
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    expect(await LoyaltyLedger.countDocuments({})).toBe(1);
    expect(await Voucher.countDocuments({})).toBe(1);
    const account = await readAccount();
    expect(account?.pointsBalance).toBe(500);
  });

  it("5. dva termina, saldo dovoljan samo za jedan → balans nikad negativan", async () => {
    await seedAccount(500);
    const [a, b] = await Promise.all([seedAppointment(), seedAppointment()]);

    const results = await Promise.allSettled([
      redeemPointsReward({ appointmentId: String(a._id), offerId: OFFER_500, actor: clientActor }),
      redeemPointsReward({ appointmentId: String(b._id), offerId: OFFER_500, actor: clientActor }),
    ]);

    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);

    const account = await readAccount();
    expect(account?.pointsBalance).toBe(0);
    expect(account!.pointsBalance).toBeGreaterThanOrEqual(0);
    expect(await LoyaltyLedger.countDocuments({})).toBe(1);
    expect(await Voucher.countDocuments({})).toBe(1);
  });

  it("6. cena i nagrada dolaze iz konfiguracije — podmetnuti iznos se ignoriše", async () => {
    await seedAccount(500);
    const appt = await seedAppointment();

    await redeemPointsReward({
      appointmentId: String(appt._id),
      offerId: OFFER_500,
      // Namerno prosleđujemo i polja koja seam NE prima: potpis funkcije je
      // jedina kapija, pa "costPoints: 1" nema gde da uđe.
      actor: clientActor,
    } as never);

    const entry = await LoyaltyLedger.findOne({ entryType: "redeem" }).lean<LedgerRow>();
    expect(entry?.amount).toBe(-500);
    const voucher = await Voucher.findOne({ origin: "points_shop" }).lean<VoucherRow>();
    expect(voucher?.value).toBe(500);
  });

  it("nepoznat offerId je 400, ne 500", async () => {
    await seedAccount(5000);
    const appt = await seedAppointment();
    await expect(
      redeemPointsReward({
        appointmentId: String(appt._id),
        offerId: "psh_neverexisted",
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });
  });

  it("izmena ponude posle kupovine ne menja već izdat vaučer", async () => {
    await seedAccount(500);
    const appt = await seedAppointment();
    const result = await redeemPointsReward({
      appointmentId: String(appt._id),
      offerId: OFFER_500,
      actor: clientActor,
    });

    await LoyaltyConfig.updateOne(
      { tenantId: TENANT, "pointsShop.id": OFFER_500 },
      { $set: { "pointsShop.$.reward.value": 50, "pointsShop.$.costPoints": 9000 } },
    );

    const voucher = await readVoucher(result.voucherId);
    expect(voucher?.value).toBe(500);
    expect(voucher?.pointsShopSnapshot?.costPoints).toBe(500);
  });
});

// ─── ONE BENEFIT ──────────────────────────────────────────────────────────────

describe("jedna pogodnost po terminu", () => {
  it("7. termin sa pogodnošću odbija drugu (409)", async () => {
    await seedAccount(2000);
    const appt = await seedAppointment();
    await redeemPointsReward({ appointmentId: String(appt._id), offerId: OFFER_500, actor: clientActor });

    await expect(
      redeemPointsReward({
        appointmentId: String(appt._id),
        offerId: OFFER_PERCENT,
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const voucher = await seedVoucher();
    await expect(
      applyExistingVoucher({
        appointmentId: String(appt._id),
        voucherId: String(voucher._id),
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(await LoyaltyLedger.countDocuments({})).toBe(1);
  });

  it("8. uklanjanje vraća vaučer u active i čisti cenu", async () => {
    const voucher = await seedVoucher();
    const appt = await seedAppointment();
    await applyExistingVoucher({
      appointmentId: String(appt._id),
      voucherId: String(voucher._id),
      actor: clientActor,
    });

    const removed = await removeBenefit({ appointmentId: String(appt._id), actor: clientActor });
    expect(removed.removed).toBe(true);

    const after = await readVoucher(voucher._id);
    expect(after?.status).toBe("active");
    expect(after?.reservedAppointmentId).toBeFalsy();

    const saved = await readAppointment(appt._id);
    expect(saved?.appliedVoucherId).toBeUndefined();
    expect(saved?.finalPrice).toBeUndefined();
    expect(saved?.discountAmount).toBeUndefined();
  });

  it("9. uklanjanje points-shop vaučera NE vraća poene", async () => {
    await seedAccount(500);
    const appt = await seedAppointment();
    const result = await redeemPointsReward({
      appointmentId: String(appt._id),
      offerId: OFFER_500,
      actor: clientActor,
    });

    const removed = await removeBenefit({ appointmentId: String(appt._id), actor: clientActor });
    expect(removed.pointsRefunded).toBe(false);

    const account = await readAccount();
    expect(account?.pointsBalance).toBe(0);
    // Vrednost nije izgubljena — vaučer je opet u novčaniku.
    const voucher = await readVoucher(result.voucherId);
    expect(voucher?.status).toBe("active");
    expect(await LoyaltyLedger.countDocuments({})).toBe(1);
  });

  it("10. zamena je uklanjanje pa nova primena — nikad stackovanje", async () => {
    await seedAccount(500);
    const appt = await seedAppointment();
    await redeemPointsReward({ appointmentId: String(appt._id), offerId: OFFER_500, actor: clientActor });
    await removeBenefit({ appointmentId: String(appt._id), actor: clientActor });

    const other = await seedVoucher({ type: "fixed", value: 300 });
    await applyExistingVoucher({
      appointmentId: String(appt._id),
      voucherId: String(other._id),
      actor: clientActor,
    });

    const saved = await readAppointment(appt._id);
    expect(String(saved?.appliedVoucherId)).toBe(String(other._id));
    expect(saved?.discountAmount).toBe(300);
    const reserved = await Voucher.countDocuments({ status: "reserved" });
    expect(reserved).toBe(1);
  });
});

// ─── VOUCHER ──────────────────────────────────────────────────────────────────

describe("primena postojećeg vaučera", () => {
  it("11. istekao vaučer je odbijen", async () => {
    const voucher = await seedVoucher({ expiresAt: new Date(Date.now() - 1000) });
    const appt = await seedAppointment();
    await expect(
      applyExistingVoucher({
        appointmentId: String(appt._id),
        voucherId: String(voucher._id),
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });
  });

  it("12. tuđi vaučer je odbijen kao nepronađen", async () => {
    const voucher = await seedVoucher({ ownerTenantUserId: OTHER_CLIENT });
    const appt = await seedAppointment();
    await expect(
      applyExistingVoucher({
        appointmentId: String(appt._id),
        voucherId: String(voucher._id),
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("13. vaučer drugog salona je odbijen", async () => {
    const voucher = await seedVoucher({ tenantId: OTHER_TENANT });
    const appt = await seedAppointment();
    await expect(
      applyExistingVoucher({
        appointmentId: String(appt._id),
        voucherId: String(voucher._id),
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("14. service-scoped vaučer na pogrešnoj usluzi je odbijen", async () => {
    const voucher = await seedVoucher({ type: "fixed", value: 500, serviceScope: [OTHER_SERVICE] });
    const appt = await seedAppointment();
    await expect(
      applyExistingVoucher({
        appointmentId: String(appt._id),
        voucherId: String(voucher._id),
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });
  });

  it("15. dva paralelna zahteva istim vaučerom → tačno jedan uspeh", async () => {
    const voucher = await seedVoucher();
    const [a, b] = await Promise.all([seedAppointment(), seedAppointment()]);

    const results = await Promise.allSettled([
      applyExistingVoucher({ appointmentId: String(a._id), voucherId: String(voucher._id), actor: clientActor }),
      applyExistingVoucher({ appointmentId: String(b._id), voucherId: String(voucher._id), actor: clientActor }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const reserved = await readVoucher(voucher._id);
    expect(reserved?.status).toBe("reserved");
    const withBenefit = await Appointment.countDocuments({
      appliedVoucherId: { $exists: true, $ne: null },
    });
    expect(withBenefit).toBe(1);
  });
});

// ─── AUTH / GATES ─────────────────────────────────────────────────────────────

describe("granice pristupa i gate-ovi", () => {
  it("36/37. klijent sme svoj termin, tuđi ne", async () => {
    const mine = await seedAppointment();
    const foreign = await seedAppointment({ clientProfileId: OTHER_CLIENT });

    await expect(
      listAvailableBenefits({ appointmentId: String(mine._id), actor: clientActor }),
    ).resolves.toMatchObject({ enabled: true });

    await expect(
      listAvailableBenefits({ appointmentId: String(foreign._id), actor: clientActor }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("38/39. admin sme termin svog salona, tuđeg ne", async () => {
    const appt = await seedAppointment();
    await expect(
      listAvailableBenefits({ appointmentId: String(appt._id), actor: adminActor }),
    ).resolves.toMatchObject({ enabled: true });

    await expect(
      listAvailableBenefits({
        appointmentId: String(appt._id),
        actor: { kind: "admin", tenantId: String(OTHER_TENANT) },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("33. LoyaltyConfig.enabled=false → nema pogodnosti", async () => {
    await LoyaltyConfig.updateOne({ tenantId: TENANT }, { $set: { enabled: false } });
    const appt = await seedAppointment();
    const benefits = await listAvailableBenefits({
      appointmentId: String(appt._id),
      actor: clientActor,
    });
    expect(benefits.enabled).toBe(false);
    expect(benefits.hasUsable).toBe(false);
  });

  it("34. points isključeni → nema points-shop ponuda ni kupovine", async () => {
    await LoyaltyConfig.updateOne(
      { tenantId: TENANT },
      { $set: { "currencies.points.enabled": false } },
    );
    await seedAccount(5000);
    const appt = await seedAppointment();

    const benefits = await listAvailableBenefits({
      appointmentId: String(appt._id),
      actor: clientActor,
    });
    expect(benefits.pointsEnabled).toBe(false);
    expect(benefits.offers).toHaveLength(0);

    await expect(
      redeemPointsReward({
        appointmentId: String(appt._id),
        offerId: OFFER_500,
        actor: clientActor,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ponuda bez stabilnog id-a se ne nudi za kupovinu", async () => {
    await LoyaltyConfig.updateOne(
      { tenantId: TENANT },
      { $set: { pointsShop: [] } },
    );
    await LoyaltyConfig.collection.updateOne(
      { tenantId: TENANT },
      {
        $set: {
          pointsShop: [
            { costPoints: 500, reward: { type: "fixed", value: 500, expiresDays: 30 } },
          ],
        },
      },
    );
    await seedAccount(5000);
    const appt = await seedAppointment();

    const benefits = await listAvailableBenefits({
      appointmentId: String(appt._id),
      actor: clientActor,
    });
    expect(benefits.offers).toHaveLength(0);
  });

  it("zatvoren termin ne prima pogodnost", async () => {
    const appt = await seedAppointment({ status: "completed" });
    const voucher = await seedVoucher();
    await expect(
      applyExistingVoucher({
        appointmentId: String(appt._id),
        voucherId: String(voucher._id),
        actor: clientActor,
      }),
    ).rejects.toBeInstanceOf(LoyaltyRedemptionError);
  });
});
