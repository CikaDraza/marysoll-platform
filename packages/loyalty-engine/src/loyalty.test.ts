import { describe, it, expect } from "vitest";
import { formatCurrencyAmount } from "./currency";
import { computeVoucherDiscount } from "./pricing";
import { generateVoucherCode } from "./codes";

describe("formatCurrencyAmount — srpska deklinacija", () => {
  const srca = { nameOne: "srce", nameFew: "srca", nameMany: "srca" };
  const poeni = { nameOne: "poen", nameFew: "poena", nameMany: "poena" };

  it.each([
    [1, "1 srce"],
    [2, "2 srca"],
    [4, "4 srca"],
    [5, "5 srca"],
    [11, "11 srca"],
    [12, "12 srca"],
    [21, "21 srce"],
    [22, "22 srca"],
    [25, "25 srca"],
    [101, "101 srce"],
    [-1, "-1 srce"],
    [-3, "-3 srca"],
  ])("srca: %i → %s", (n, expected) => {
    expect(formatCurrencyAmount(n, srca)).toBe(expected);
  });

  it.each([
    [1, "1 poen"],
    [3, "3 poena"],
    [7, "7 poena"],
    [111, "111 poena"],
    [121, "121 poen"],
  ])("poeni: %i → %s", (n, expected) => {
    expect(formatCurrencyAmount(n, poeni)).toBe(expected);
  });
});

describe("computeVoucherDiscount", () => {
  const services = [
    { serviceId: "aaa", price: 2000, quantity: 1 },
    { serviceId: "bbb", price: 1500, quantity: 2 },
  ]; // ukupno 5000

  it("percent bez scope-a: procenat od ukupnog", () => {
    expect(
      computeVoucherDiscount({ type: "percent", value: 20 }, services),
    ).toBe(1000);
  });

  it("percent sa scope-om: procenat samo od usluga u scope-u", () => {
    expect(
      computeVoucherDiscount(
        { type: "percent", value: 50, serviceScope: ["bbb"] },
        services,
      ),
    ).toBe(1500);
  });

  it("fixed: pun iznos kada je manji od ukupnog", () => {
    expect(
      computeVoucherDiscount({ type: "fixed", value: 1200 }, services),
    ).toBe(1200);
  });

  it("fixed: clamp na ukupno — popust nikad ne prelazi cenu", () => {
    expect(
      computeVoucherDiscount({ type: "fixed", value: 99999 }, services),
    ).toBe(5000);
  });

  it("free_service: cena prve usluge u scope-u (jedan komad)", () => {
    expect(
      computeVoucherDiscount(
        { type: "free_service", value: 0, serviceScope: ["bbb"] },
        services,
      ),
    ).toBe(1500);
  });

  it("free_service bez scope-a: prva usluga", () => {
    expect(
      computeVoucherDiscount({ type: "free_service", value: 0 }, services),
    ).toBe(2000);
  });

  it("free_service van scope-a: nema popusta", () => {
    expect(
      computeVoucherDiscount(
        { type: "free_service", value: 0, serviceScope: ["ccc"] },
        services,
      ),
    ).toBe(0);
  });

  it("prazne usluge: nema popusta", () => {
    expect(computeVoucherDiscount({ type: "percent", value: 20 }, [])).toBe(0);
  });

  it("percent sa scope-om ne prelazi ukupno", () => {
    const cheap = [{ serviceId: "aaa", price: 100, quantity: 1 }];
    expect(
      computeVoucherDiscount({ type: "percent", value: 100 }, cheap),
    ).toBe(100);
  });
});

describe("generateVoucherCode", () => {
  it("generiše 8 znakova iz bezbednog alfabeta (bez 0/O/1/I/L)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateVoucherCode();
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it("dodaje prefiks kada je zadat", () => {
    expect(generateVoucherCode("GIFT")).toMatch(
      /^GIFT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/,
    );
  });

  it("kodovi su praktično jedinstveni", () => {
    const codes = new Set(
      Array.from({ length: 200 }, () => generateVoucherCode()),
    );
    expect(codes.size).toBe(200);
  });
});
