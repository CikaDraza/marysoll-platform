import { describe, expect, it } from "vitest";
import {
  computeBenefitPricing,
  evaluatePointsShopOffer,
  isVoucherApplicableToService,
  pointsShopIdempotencyKey,
} from "./redemption";

const SERVICE_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const SERVICE_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("isVoucherApplicableToService", () => {
  it("prazan scope važi za svaku uslugu", () => {
    expect(isVoucherApplicableToService({ serviceScope: [] }, SERVICE_A)).toBe(true);
    expect(isVoucherApplicableToService({}, SERVICE_A)).toBe(true);
  });

  it("scope-ovan vaučer važi samo za uslugu iz scope-a", () => {
    const voucher = { serviceScope: [SERVICE_A] };
    expect(isVoucherApplicableToService(voucher, SERVICE_A)).toBe(true);
    expect(isVoucherApplicableToService(voucher, SERVICE_B)).toBe(false);
    expect(isVoucherApplicableToService(voucher, null)).toBe(false);
  });
});

describe("computeBenefitPricing", () => {
  it("nepoznata osnovica ostavlja sva tri polja null", () => {
    expect(
      computeBenefitPricing({
        basis: null,
        serviceId: SERVICE_A,
        voucher: { type: "percent", value: 20 },
      }),
    ).toEqual({ originalPrice: null, discountAmount: null, finalPrice: null });
  });

  it("procenat nad poznatom osnovicom", () => {
    expect(
      computeBenefitPricing({
        basis: 4000,
        serviceId: SERVICE_A,
        voucher: { type: "percent", value: 20 },
      }),
    ).toEqual({ originalPrice: 4000, discountAmount: 800, finalPrice: 3200 });
  });

  it("fiksni popust nikad ne pravi negativan iznos", () => {
    expect(
      computeBenefitPricing({
        basis: 300,
        serviceId: SERVICE_A,
        voucher: { type: "fixed", value: 500 },
      }),
    ).toEqual({ originalPrice: 300, discountAmount: 300, finalPrice: 0 });
  });

  it("fiksni popust van scope-a NE skida ništa (zatvara rupu u čistom obračunu)", () => {
    expect(
      computeBenefitPricing({
        basis: 4000,
        serviceId: SERVICE_B,
        voucher: { type: "fixed", value: 500, serviceScope: [SERVICE_A] },
      }),
    ).toEqual({ originalPrice: 4000, discountAmount: 0, finalPrice: 4000 });
  });

  it("bez vaučera osnovica prolazi netaknuta", () => {
    expect(
      computeBenefitPricing({ basis: 2500, serviceId: SERVICE_A, voucher: null }),
    ).toEqual({ originalPrice: 2500, discountAmount: 0, finalPrice: 2500 });
  });

  it("nula je stvarna nula, ne nepoznato", () => {
    expect(
      computeBenefitPricing({
        basis: 0,
        serviceId: SERVICE_A,
        voucher: { type: "percent", value: 20 },
      }),
    ).toEqual({ originalPrice: 0, discountAmount: 0, finalPrice: 0 });
  });
});

describe("evaluatePointsShopOffer", () => {
  const offer = {
    id: "of_1",
    costPoints: 500,
    reward: { type: "fixed" as const, value: 500, expiresDays: 30 },
  };

  it("dovoljan saldo → eligible", () => {
    const res = evaluatePointsShopOffer({ offer, pointsBalance: 500, serviceId: SERVICE_A });
    expect(res).toEqual({ affordable: true, applicable: true, eligible: true, missingPoints: 0 });
  });

  it("nedovoljan saldo → nije eligible i kaže koliko fali", () => {
    const res = evaluatePointsShopOffer({ offer, pointsBalance: 499, serviceId: SERVICE_A });
    expect(res.eligible).toBe(false);
    expect(res.missingPoints).toBe(1);
  });

  it("nagrada vezana za drugu uslugu nije primenljiva", () => {
    const scoped = { ...offer, reward: { ...offer.reward, serviceId: SERVICE_A } };
    const res = evaluatePointsShopOffer({
      offer: scoped,
      pointsBalance: 5000,
      serviceId: SERVICE_B,
    });
    expect(res.affordable).toBe(true);
    expect(res.applicable).toBe(false);
    expect(res.eligible).toBe(false);
  });
});

describe("pointsShopIdempotencyKey", () => {
  it("stabilan je za isti termin i istu ponudu", () => {
    expect(pointsShopIdempotencyKey("appt1", "of_1")).toBe("points-shop:appt1:of_1");
    expect(pointsShopIdempotencyKey("appt1", "of_2")).not.toBe(
      pointsShopIdempotencyKey("appt1", "of_1"),
    );
  });
});
