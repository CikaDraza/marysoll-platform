/**
 * Canonical cena termina — četiri različite činjenice.
 *
 *   katalog → snapshot pri rezervaciji → quote salona → stvarno naplaćeno
 *
 * Pravilo brojeva koje ovi testovi drže:
 *   0    = poznata cena od nula dinara
 *   null = cena nije poznata / nije potvrđena
 */
import { describe, it, expect } from "vitest";
import {
  buildPricingSnapshot,
  applyQuote,
  getAppointmentPotentialValue,
  getAppointmentQuotedValue,
  getAppointmentRealizedValue,
} from "./pricingSnapshot";
import { estimateServicePrice } from "@/helpers/servicePrice";
import type { IService, IAppointmentPricing } from "@/types";

function svc(p: Partial<IService>): IService {
  return {
    _id: "s", name: "Izlivanje noktiju", category: "Nokti", type: "single",
    description: "", items: [], subscription: { enabled: false },
    createdAt: "", updatedAt: "", ...p,
  } as IService;
}
const stiker = { name: "Stiker 3D", price: 700, duration: 10, perItem: true };
const pick = [{ name: "Stiker 3D", quantity: 1 }];

function snapshotFor(service: IService, extras = pick) {
  return buildPricingSnapshot(estimateServicePrice({ service, extras }));
}

describe("snapshot pri rezervaciji", () => {
  it("FIXED: tačna osnovica i ukupno", () => {
    const p = snapshotFor(
      svc({ basePrice: 2000, duration: 120, extras: [stiker] }),
    );
    expect(p.mode).toBe("fixed");
    expect(p.baseAmount).toBe(2000);
    expect(p.knownAddonsTotal).toBe(700);
    expect(p.minimumTotal).toBe(2700);
    expect(p.currency).toBe("RSD");
  });

  it("FROM: minimum je brojiv, ali je i dalje minimum", () => {
    const p = snapshotFor(
      svc({ priceMode: "from", basePrice: 2000, duration: 120, extras: [stiker] }),
    );
    expect(p.mode).toBe("from");
    expect(p.baseAmount).toBe(2000);
    expect(p.minimumTotal).toBe(2700);
  });

  it("ON_REQUEST: osnovica i ukupno su null, dodaci poznati", () => {
    const p = snapshotFor(
      svc({ priceMode: "on_request", duration: 120, extras: [stiker] }),
    );
    expect(p.mode).toBe("on_request");
    expect(p.baseAmount).toBeNull();
    expect(p.minimumTotal).toBeNull();
    expect(p.knownAddonsTotal).toBe(700);
    expect(p.quotedTotal).toBeNull();
    expect(p.chargedAmount).toBeNull();
  });

  it("stavke pamte odakle je cena došla", () => {
    const p = snapshotFor(
      svc({ priceMode: "on_request", duration: 120, extras: [stiker] }),
    );
    expect(p.lines.map((l) => [l.label, l.amount])).toEqual([
      ["Izlivanje noktiju", null],
      ["Stiker 3D", 700],
    ]);
  });

  it("besplatna usluga je 0, ne null", () => {
    const p = buildPricingSnapshot(
      estimateServicePrice({ service: svc({ basePrice: 0, duration: 30 }) }),
    );
    expect(p.minimumTotal).toBe(0);
    expect(p.baseAmount).toBe(0);
  });
});

describe("quote", () => {
  it("salon unosi OSNOVNU cenu, server izvodi ukupno", () => {
    const base = snapshotFor(
      svc({ priceMode: "on_request", duration: 120, extras: [stiker] }),
    );
    const quoted = applyQuote(base, 3000, "admin-1");
    expect(quoted.quotedBaseAmount).toBe(3000);
    expect(quoted.quotedTotal).toBe(3700); // 3000 + 700 poznatih dodataka
    expect(quoted.quotedBy).toBe("admin-1");
  });

  it("promena osnovice preračunava ukupno", () => {
    const base = snapshotFor(
      svc({ priceMode: "on_request", duration: 120, extras: [stiker] }),
    );
    expect(applyQuote(applyQuote(base, 3000), 4000).quotedTotal).toBe(4700);
  });

  it("snapshot rezervacije ostaje netaknut posle quote-a", () => {
    const base = snapshotFor(
      svc({ priceMode: "on_request", duration: 120, extras: [stiker] }),
    );
    const quoted = applyQuote(base, 3000);
    expect(quoted.minimumTotal).toBeNull();
    expect(quoted.baseAmount).toBeNull();
  });
});

describe("analytics accessori", () => {
  const withPricing = (p: Partial<IAppointmentPricing>) =>
    ({
      services: [],
      status: "completed",
      pricing: {
        mode: "on_request", currency: "RSD", baseAmount: null,
        minimumTotal: null, knownAddonsTotal: 0, lines: [], ...p,
      },
    }) as never;

  it("FIXED: potencijal i realizacija su tačan iznos", () => {
    const a = withPricing({ mode: "fixed", baseAmount: 2000, minimumTotal: 2700 });
    expect(getAppointmentPotentialValue(a)).toBe(2700);
    expect(getAppointmentRealizedValue(a)).toBe(2700);
  });

  it("FROM: minimum je potencijal, ali NIJE realizacija", () => {
    const a = withPricing({ mode: "from", baseAmount: 2000, minimumTotal: 2700 });
    expect(getAppointmentPotentialValue(a)).toBe(2700);
    expect(getAppointmentRealizedValue(a)).toBeNull();
  });

  it("ON_REQUEST bez quote-a: potencijal je null, dodaci se NE broje", () => {
    const a = withPricing({ knownAddonsTotal: 700 });
    expect(getAppointmentPotentialValue(a)).toBeNull();
    expect(getAppointmentQuotedValue(a)).toBeNull();
    expect(getAppointmentRealizedValue(a)).toBeNull();
  });

  it("ON_REQUEST sa quote-om: quote je potencijal, ne realizacija", () => {
    const a = withPricing({ knownAddonsTotal: 700, quotedTotal: 3700 });
    expect(getAppointmentPotentialValue(a)).toBe(3700);
    expect(getAppointmentQuotedValue(a)).toBe(3700);
    expect(getAppointmentRealizedValue(a)).toBeNull();
  });

  it("chargedAmount je jedina realizacija i odvojen je od quote-a", () => {
    const a = withPricing({ quotedTotal: 3700, chargedAmount: 3900 });
    expect(getAppointmentQuotedValue(a)).toBe(3700);
    expect(getAppointmentRealizedValue(a)).toBe(3900);
  });

  it("chargedAmount = 0 je stvarna nula, ne „nepoznato“", () => {
    const a = withPricing({ chargedAmount: 0 });
    expect(getAppointmentRealizedValue(a)).toBe(0);
  });

  it("LEGACY: zatečeni termin sa cenom se i dalje računa", () => {
    const legacy = {
      services: [{ price: 2500, quantity: 1 }],
      status: "completed",
    } as never;
    expect(getAppointmentRealizedValue(legacy)).toBe(2500);
    expect(getAppointmentPotentialValue(legacy)).toBe(2500);
  });

  it("LEGACY: `price: 0` na upit NIJE prihod od nula dinara", () => {
    // Stari termini za usluge na upit upisivali su 0 jer cena nije bila
    // poznata. Bez snapshot-a se to ne može razlikovati od besplatne usluge,
    // pa se ne sme računati kao realizovan prihod.
    const legacy = {
      services: [{ price: 0, quantity: 1 }],
      status: "completed",
    } as never;
    expect(getAppointmentRealizedValue(legacy)).toBeNull();
  });
});
