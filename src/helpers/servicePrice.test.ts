import { describe, it, expect } from "vitest";
import { minServicePrice, isPriceFrom } from "./servicePrice";
import {
  formatServicePrice,
  normalizePriceMode,
  PRICE_ON_REQUEST_LABEL,
} from "./formatPrice";
import type { IService } from "@/types";

/** Minimalna usluga — testovi dopunjuju samo polja koja mere. */
function svc(partial: Partial<IService>): IService {
  return {
    _id: "s1",
    name: "Usluga",
    category: "Nokti",
    type: "single",
    description: "",
    items: [],
    subscription: { enabled: false },
    createdAt: "",
    updatedAt: "",
    ...partial,
  } as IService;
}

describe("minServicePrice", () => {
  it("jedna usluga: cena je basePrice", () => {
    expect(minServicePrice(svc({ type: "single", basePrice: 2000 }))).toBe(2000);
  });

  it("cena na upit nema iznos", () => {
    expect(
      minServicePrice(
        svc({ type: "single", basePrice: 2000, priceMode: "on_request" }),
      ),
    ).toBeNull();
  });

  it("varijante: najniža cena varijante", () => {
    const s = svc({
      type: "variant",
      variants: [
        { name: "Novi set", price: 3500, duration: 120, perItem: false },
        { name: "Korekcija", price: 2500, duration: 90, perItem: false },
      ],
    });
    expect(minServicePrice(s)).toBe(2500);
  });

  it("REGRESIJA: varijanta na upit se ne računa kao 0 RSD", () => {
    // Javni serializer piše `price: Number(v.price ?? 0)`, pa varijanta na upit
    // stiže kao 0. Ranije je Math.min to pretvarao u "od 0,00 RSD".
    const s = svc({
      type: "variant",
      variants: [
        { name: "Veličina 1", price: 1800, duration: 90, perItem: false },
        {
          name: "Veličina 3",
          price: 0,
          priceMode: "on_request",
          duration: 90,
          perItem: false,
        },
      ],
    });
    expect(minServicePrice(s)).toBe(1800);
  });

  it("sve varijante na upit: donja granica dolazi sa korena", () => {
    const s = svc({
      type: "variant",
      priceMode: "from",
      basePrice: 2000,
      variants: [
        {
          name: "Veličina 1",
          price: 0,
          priceMode: "on_request",
          duration: 120,
          perItem: false,
        },
      ],
    });
    expect(minServicePrice(s)).toBe(2000);
  });

  it("sve varijante na upit bez korena: nema šta da se prikaže", () => {
    const s = svc({
      type: "variant",
      variants: [
        {
          name: "Veličina 1",
          price: 0,
          priceMode: "on_request",
          duration: 120,
          perItem: false,
        },
      ],
    });
    expect(minServicePrice(s)).toBeNull();
  });

  it("paket: cena je na korenu, ne na stavkama", () => {
    const s = svc({
      type: "group",
      basePrice: 6000,
      duration: 120,
      services: [
        { name: "Šminkanje", description: "" },
        { name: "Trepavice", description: "" },
      ],
    });
    expect(minServicePrice(s)).toBe(6000);
  });

  it("zatečeni paket bez cene na korenu: zbir stavki, ne najniža", () => {
    // Stari model je cenu držao po stavci. Paket košta zbir, pa se prikazuje
    // zbir — "od najniže stavke" bi obmanulo, jer paket nije alternativa.
    const s = svc({
      type: "group",
      services: [
        { name: "Šminkanje", price: 4000, duration: 60, description: "" },
        { name: "Trepavice", price: 2000, duration: 60, description: "" },
      ],
    });
    expect(minServicePrice(s)).toBe(6000);
  });
});

describe("isPriceFrom", () => {
  it("tip cene „od“ uvek daje donju granicu", () => {
    expect(isPriceFrom(svc({ type: "single", priceMode: "from", basePrice: 2000 }))).toBe(true);
  });

  it("jedna usluga sa fiksnom cenom nije „od“", () => {
    expect(isPriceFrom(svc({ type: "single", basePrice: 2000 }))).toBe(false);
  });

  it("paket sa jednom cenom nije „od“", () => {
    const s = svc({
      type: "group",
      basePrice: 6000,
      services: [{ name: "Šminkanje", description: "" }],
    });
    expect(isPriceFrom(s)).toBe(false);
  });

  it("varijante sa različitim cenama jesu „od“", () => {
    const s = svc({
      type: "variant",
      variants: [
        { name: "Novi set", price: 3500, duration: 120, perItem: false },
        { name: "Korekcija", price: 2500, duration: 90, perItem: false },
      ],
    });
    expect(isPriceFrom(s)).toBe(true);
  });

  it("varijante sa istom cenom nisu „od“", () => {
    const s = svc({
      type: "variant",
      variants: [
        { name: "Leva", price: 3000, duration: 60, perItem: false },
        { name: "Desna", price: 3000, duration: 60, perItem: false },
      ],
    });
    expect(isPriceFrom(s)).toBe(false);
  });

  it("sve varijante na upit: koren nije „od“ osim ako je tako označen", () => {
    const variants = [
      {
        name: "Veličina 1",
        price: 0,
        priceMode: "on_request" as const,
        duration: 120,
        perItem: false,
      },
    ];
    expect(isPriceFrom(svc({ type: "variant", basePrice: 2000, variants }))).toBe(false);
    expect(
      isPriceFrom(svc({ type: "variant", priceMode: "from", basePrice: 2000, variants })),
    ).toBe(true);
  });
});

describe("formatServicePrice", () => {
  it("fiksna cena", () => {
    expect(formatServicePrice(2000, "fixed")).toBe("2.000,00 RSD");
  });

  it("„od“ dobija prefiks", () => {
    expect(formatServicePrice(2000, "from")).toBe("od 2.000,00 RSD");
  });

  it("na upit ignoriše iznos", () => {
    expect(formatServicePrice(2000, "on_request")).toBe(PRICE_ON_REQUEST_LABEL);
  });

  it("prazan iznos ne daje sam sufiks", () => {
    expect(formatServicePrice(null, "fixed")).toBe("");
    expect(formatServicePrice(null, "from")).toBe("");
  });
});

describe("normalizePriceMode", () => {
  it("čuva sva tri režima", () => {
    expect(normalizePriceMode("fixed")).toBe("fixed");
    expect(normalizePriceMode("from")).toBe("from");
    expect(normalizePriceMode("on_request")).toBe("on_request");
  });

  it("REGRESIJA: „from“ ne sme da se sruši na „fixed“", () => {
    // Serializeri su ranije pisali `x === "on_request" ? "on_request" : "fixed"`,
    // pa bi usluga sa donjom granicom u cenovniku izgledala kao konačna cena.
    expect(normalizePriceMode("from")).not.toBe("fixed");
  });

  it("nepoznata vrednost pada na fiksnu cenu", () => {
    expect(normalizePriceMode(undefined)).toBe("fixed");
    expect(normalizePriceMode("besplatno")).toBe("fixed");
  });
});
