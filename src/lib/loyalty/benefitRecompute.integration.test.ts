/**
 * T1-4 — vaučer prati cenu i uslugu (§13/§14).
 *
 * Ovo je rupa koju je T1-4 dobio kao zadatak da zatvori: vaučer rezervisan na
 * terminu „na upit" ostajao je sa `null` iznosima ZAUVEK, jer nijedna putanja
 * nije radila recompute kada salon kasnije potvrdi cenu. Druga strana iste
 * rupe: promena usluge ostavljala je service-scoped popust na pogrešnoj
 * usluzi.
 */
import mongoose, { Types } from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Appointment } from "@/models/Appointment";
import { Voucher } from "@/models/Voucher";
import {
  commitBenefitRecompute,
  computeAppointmentBenefitPricing,
  planBenefitRecompute,
} from "./redemption";
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

async function seedVoucher(overrides: Record<string, unknown> = {}) {
  return Voucher.create({
    tenantId: TENANT,
    code: `V-${new Types.ObjectId().toString().slice(-8).toUpperCase()}`,
    type: "percent",
    value: 20,
    serviceScope: [],
    origin: "auto_rule",
    ownerTenantUserId: CLIENT,
    status: "reserved",
    ...overrides,
  });
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri(), { dbName: "benefit-recompute-test" });
}, 90_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

beforeEach(async () => {
  await Promise.all([Appointment.deleteMany({}), Voucher.deleteMany({})]);
});

// ─── PRICING (16–20) ──────────────────────────────────────────────────────────

describe("obračun pogodnosti", () => {
  it("16. fiksna cena 4000 + vaučer 20% → 4000 / 800 / 3200", () => {
    expect(
      computeAppointmentBenefitPricing({
        appointment: {
          pricing: pricing({}),
          services: [{ serviceId: SERVICE }],
        },
        voucher: { type: "percent", value: 20 },
      }),
    ).toEqual({ originalPrice: 4000, discountAmount: 800, finalPrice: 3200 });
  });

  it("17. fiksna cena 300 + vaučer 500 RSD → popust 300, konačno 0", () => {
    expect(
      computeAppointmentBenefitPricing({
        appointment: {
          pricing: pricing({ baseAmount: 300, minimumTotal: 300 }),
          services: [{ serviceId: SERVICE }],
        },
        voucher: { type: "fixed", value: 500 },
      }),
    ).toEqual({ originalPrice: 300, discountAmount: 300, finalPrice: 0 });
  });

  it("18. `on_request` bez quote-a → sva tri iznosa null", () => {
    expect(
      computeAppointmentBenefitPricing({
        appointment: {
          pricing: pricing({
            mode: "on_request",
            baseAmount: null,
            minimumTotal: null,
          }),
          services: [{ serviceId: SERVICE }],
        },
        voucher: { type: "percent", value: 20 },
      }),
    ).toEqual({ originalPrice: null, discountAmount: null, finalPrice: null });
  });

  it("19. quote 4000 posle toga → obračun nastaje", async () => {
    const voucher = await seedVoucher();
    const plan = await planBenefitRecompute({
      appliedVoucherId: voucher._id,
      pricing: pricing({
        mode: "on_request",
        baseAmount: null,
        minimumTotal: null,
        quotedTotal: 4000,
        quotedBaseAmount: 4000,
      }),
      services: [{ serviceId: SERVICE }],
    });
    expect(plan.kind).toBe("recomputed");
    expect(plan.set).toEqual({
      originalPrice: 4000,
      discountAmount: 800,
      finalPrice: 3200,
    });
  });

  it("20. promena quote-a 4000 → 4500 daje nov obračun", async () => {
    const voucher = await seedVoucher();
    const at4500 = await planBenefitRecompute({
      appliedVoucherId: voucher._id,
      pricing: pricing({ mode: "on_request", quotedTotal: 4500 }),
      services: [{ serviceId: SERVICE }],
    });
    expect(at4500.set).toEqual({
      originalPrice: 4500,
      discountAmount: 900,
      finalPrice: 3600,
    });
  });

  it("quote nadjačava katalog kao pre-discount osnovica", async () => {
    const voucher = await seedVoucher();
    const plan = await planBenefitRecompute({
      appliedVoucherId: voucher._id,
      // Katalog kaže 4000, salon je potvrdio 6000 (npr. po fotografiji).
      pricing: pricing({ quotedTotal: 6000 }),
      services: [{ serviceId: SERVICE }],
    });
    expect(plan.set?.originalPrice).toBe(6000);
    expect(plan.set?.discountAmount).toBe(1200);
  });
});

// ─── LIFECYCLE (21–23) ────────────────────────────────────────────────────────

describe("promena termina", () => {
  it("21. pomeranje datuma/vremena ne dira pogodnost", async () => {
    const voucher = await seedVoucher();
    const state = {
      appliedVoucherId: voucher._id,
      pricing: pricing({}),
      services: [{ serviceId: SERVICE }],
    };
    const before = await planBenefitRecompute(state);
    // Isti izbor i ista cena — samo drugi sat.
    const after = await planBenefitRecompute(state);

    expect(after.kind).toBe("recomputed");
    expect(after.set).toEqual(before.set);
    const stillReserved = await Voucher.findById(voucher._id).lean<{ status: string }>();
    expect(stillReserved?.status).toBe("reserved");
  });

  it("22. promena usluge uz vaučer koji i dalje važi → recompute nad novom cenom", async () => {
    const voucher = await seedVoucher();
    const plan = await planBenefitRecompute({
      appliedVoucherId: voucher._id,
      pricing: pricing({ baseAmount: 2000, minimumTotal: 2000 }),
      services: [{ serviceId: OTHER_SERVICE }],
    });
    expect(plan.kind).toBe("recomputed");
    expect(plan.set).toEqual({
      originalPrice: 2000,
      discountAmount: 400,
      finalPrice: 1600,
    });
  });

  it("23. promena usluge van scope-a → vaučer se oslobađa, pogodnost pada", async () => {
    const voucher = await seedVoucher({
      type: "fixed",
      value: 500,
      serviceScope: [SERVICE],
    });
    const plan = await planBenefitRecompute({
      appliedVoucherId: voucher._id,
      pricing: pricing({}),
      services: [{ serviceId: OTHER_SERVICE }],
    });

    expect(plan.kind).toBe("released");
    expect(String(plan.releaseVoucherId)).toBe(String(voucher._id));
    expect(plan.set).toBeUndefined();

    await commitBenefitRecompute(plan, async () => undefined);
    const after = await Voucher.findById(voucher._id).lean<{
      status: string;
      reservedAppointmentId?: unknown;
    }>();
    expect(after?.status).toBe("active");
    expect(after?.reservedAppointmentId).toBeFalsy();
  });

  it("termin bez pogodnosti nema šta da recompute-uje", async () => {
    const plan = await planBenefitRecompute({
      appliedVoucherId: null,
      pricing: pricing({}),
      services: [{ serviceId: SERVICE }],
    });
    expect(plan).toEqual({ kind: "none" });
  });

  it("nestao vaučer oslobađa termin umesto da ga zaključa", async () => {
    const plan = await planBenefitRecompute({
      appliedVoucherId: new Types.ObjectId(),
      pricing: pricing({}),
      services: [{ serviceId: SERVICE }],
    });
    expect(plan.kind).toBe("released");
    // Nema šta da se vrati u novčanik — poziv sme da prođe bez greške.
    await expect(
      commitBenefitRecompute(plan, async () => "ok"),
    ).resolves.toBe("ok");
  });
});
