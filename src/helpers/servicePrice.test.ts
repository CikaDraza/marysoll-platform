import { describe, it, expect } from "vitest";
import {
  minServicePrice,
  isPriceFrom,
  estimateServicePrice,
} from "./servicePrice";
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

  it("REGRESIJA: „od“ NE računa minimum iz varijanti", () => {
    // Kod "from" varijanta nosi DOPLATU, ne punu cenu. Da minimum ide iz
    // `variants[]`, cenovnik bi prikazao doplatu kao da je cena usluge.
    const s = svc({
      type: "variant",
      priceMode: "from",
      basePrice: 2000,
      variants: [
        { name: "Veličina 1", price: 0, additionalPrice: 300, duration: 120, perItem: false },
      ],
    });
    expect(minServicePrice(s)).toBe(2000);
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

  it("paket bez cene na korenu nema cenu — stavke se NE sabiraju", () => {
    // Stavke paketa opisuju šta je uključeno; one nisu cenovnik. Zatečeni
    // paketi po starom modelu se migriraju, ne pogađaju.
    const s = svc({
      type: "group",
      services: [
        { name: "Šminkanje", price: 4000, duration: 60, description: "" },
        { name: "Trepavice", price: 2000, duration: 60, description: "" },
      ],
    });
    expect(minServicePrice(s)).toBeNull();
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

describe("estimateServicePrice", () => {
  const stiker = { name: "Stiker", price: 500, duration: 5, perItem: true };
  const sirena = {
    name: "Morska sirena",
    price: 0,
    priceMode: "on_request" as const,
    duration: 10,
    perItem: true,
  };

  it("REGRESIJA: fiksna varijanta zadržava PUNU cenu", () => {
    // theme-8 zavisi od ovoga: `variants[].price` je apsolutna cena, nikad
    // doplata. Da se značenje promeni, sve postojeće variant usluge bi pale.
    const s = svc({
      type: "variant",
      basePrice: 9999,
      variants: [
        { name: "Novi set", price: 3500, duration: 120, perItem: false },
        { name: "Korekcija", price: 2500, duration: 90, perItem: false },
      ],
      extras: [stiker],
    });
    const e = estimateServicePrice({
      service: s,
      variantName: "Korekcija",
      extras: [{ name: "Stiker", quantity: 1 }],
    });
    expect(e.total).toBe(3000); // 2500 + 500 — basePrice se NE dodaje
    expect(e.isEstimate).toBe(false);
    expect(e.durationMinutes).toBe(95);
  });

  it("„od“: osnovna cena + doplata varijante + dodaci", () => {
    const s = svc({
      type: "variant",
      priceMode: "from",
      basePrice: 2000,
      duration: 120,
      variants: [
        { name: "Veličina 1", price: 0, additionalPrice: 0, duration: 120, perItem: false },
        { name: "Veličina 5", price: 0, additionalPrice: 800, duration: 150, perItem: false },
      ],
      extras: [stiker],
    });
    const e = estimateServicePrice({
      service: s,
      variantName: "Veličina 5",
      extras: [{ name: "Stiker", quantity: 1 }],
    });
    expect(e.total).toBe(3300); // 2000 + 800 + 500
    expect(e.isEstimate).toBe(true);
    expect(e.durationMinutes).toBe(155); // varijanta 150 + dodatak 5
  });

  it("„od“ sa varijantom na upit: procena drži poznate delove", () => {
    // Marijin slučaj: Veličina 3 bez poznate doplate, plus poznat dodatak.
    const s = svc({
      type: "variant",
      priceMode: "from",
      basePrice: 2000,
      duration: 120,
      variants: [
        {
          name: "Veličina 3",
          price: 0,
          priceMode: "on_request",
          duration: 0,
          perItem: false,
        },
      ],
      extras: [{ ...stiker, price: 1000 }],
    });
    const e = estimateServicePrice({
      service: s,
      variantName: "Veličina 3",
      extras: [{ name: "Stiker", quantity: 1 }],
    });
    expect(e.total).toBe(3000); // 2000 + 1000; nepoznata doplata ne ulazi
    expect(e.isEstimate).toBe(true);
    expect(e.unknown).toBe(false);
    expect(e.lines.map((l) => [l.label, l.amount])).toEqual([
      ["Osnovna cena", 2000],
      ["Veličina 3", null],
      ["Stiker", 1000],
    ]);
  });

  it("paket: jedna cena sa korena plus dodaci", () => {
    const s = svc({
      type: "group",
      basePrice: 6000,
      duration: 120,
      services: [{ name: "Šminkanje", description: "" }],
      extras: [stiker],
    });
    const e = estimateServicePrice({ service: s, extras: [{ name: "Stiker", quantity: 1 }] });
    expect(e.total).toBe(6500);
    expect(e.isEstimate).toBe(false);
    expect(e.durationMinutes).toBe(125);
  });

  it("sve na upit: nema iznosa, total je null (ne 0)", () => {
    const s = svc({
      type: "single",
      priceMode: "on_request",
      duration: 60,
      extras: [sirena],
    });
    const e = estimateServicePrice({ service: s, extras: [{ name: "Morska sirena", quantity: 1 }] });
    expect(e.unknown).toBe(true);
    expect(e.total).toBeNull();
    expect(e.knownAddonsTotal).toBe(0);
  });

  it("dodatak na upit pretvara fiksnu cenu u procenu", () => {
    const s = svc({
      type: "single",
      basePrice: 2000,
      duration: 60,
      extras: [sirena],
    });
    const e = estimateServicePrice({ service: s, extras: [{ name: "Morska sirena", quantity: 1 }] });
    expect(e.total).toBe(2000);
    expect(e.isEstimate).toBe(true);
    expect(e.unknown).toBe(false);
  });
});

describe("estimateServicePrice — količina dodatka", () => {
  const stiker = {
    name: "Stiker",
    price: 500,
    duration: 5,
    perItem: true,
    unitLabel: "kom",
    allowQuantity: true,
  };
  const french = { name: "French", price: 500, duration: 10, perItem: false };

  it("količina množi i cenu i trajanje", () => {
    const s = svc({ type: "single", basePrice: 2000, duration: 60, extras: [stiker] });
    const e = estimateServicePrice({
      service: s,
      extras: [{ name: "Stiker", quantity: 3 }],
    });
    expect(e.total).toBe(3500); // 2000 + 3 × 500
    expect(e.durationMinutes).toBe(75); // 60 + 3 × 5
    expect(e.lines[1]).toMatchObject({ label: "Stiker", amount: 1500, quantity: 3 });
  });

  it("dodatak bez količine se naplaćuje jednom, ma šta stiglo", () => {
    // Zaštita od pokvarenog klijenta: `allowQuantity: false` znači čekiranje,
    // pa količina 5 ne sme da napravi peterostruku cenu.
    const s = svc({ type: "single", basePrice: 2000, duration: 60, extras: [french] });
    const e = estimateServicePrice({
      service: s,
      extras: [{ name: "French", quantity: 5 }],
    });
    expect(e.total).toBe(2500);
    expect(e.durationMinutes).toBe(70);
  });

  it("dodatak na upit sa količinom ostaje bez iznosa", () => {
    const sirena = {
      name: "Morska sirena",
      price: 0,
      priceMode: "on_request" as const,
      duration: 10,
      perItem: true,
      allowQuantity: true,
    };
    const s = svc({ type: "single", basePrice: 2000, duration: 60, extras: [sirena] });
    const e = estimateServicePrice({
      service: s,
      extras: [{ name: "Morska sirena", quantity: 2 }],
    });
    expect(e.total).toBe(2000);
    expect(e.isEstimate).toBe(true);
    expect(e.durationMinutes).toBe(80); // trajanje se množi i kad cena nije poznata
  });
});

describe("tri canonical režima cene", () => {
  const stiker3d = { name: "Stiker 3D", price: 700, duration: 10, perItem: true };
  const cirkoni = { name: "Cirkoni", price: 200, duration: 5, perItem: true };
  const sirenaNaUpit = {
    name: "Morska sirena",
    price: 0,
    priceMode: "on_request" as const,
    duration: 10,
    perItem: true,
  };

  describe("ON_REQUEST — nepoznata baza truje ceo zbir", () => {
    it("REGRESIJA: usluga na upit + dodatak 700 NIJE 700", () => {
      // `UNKNOWN + 700 = UNKNOWN`. Prikaz „od 700 RSD" je izgledao kao da
      // termin košta 700, a znamo samo jedan deo računa.
      const e = estimateServicePrice({
        service: svc({
          type: "single",
          priceMode: "on_request",
          duration: 120,
          extras: [stiker3d],
        }),
        extras: [{ name: "Stiker 3D", quantity: 1 }],
      });
      expect(e.total).toBeNull();
      expect(e.unknown).toBe(true);
      expect(e.knownAddonsTotal).toBe(700);
      expect(e.mode).toBe("on_request");
    });

    it("REGRESIJA: Marijin slučaj — varijanta na upit + dodatak 700", () => {
      const e = estimateServicePrice({
        service: svc({
          type: "variant",
          duration: 120,
          variants: [
            {
              name: "Veličina 3",
              price: 0,
              priceMode: "on_request",
              duration: 120,
              perItem: false,
            },
          ],
          extras: [stiker3d],
        }),
        variantName: "Veličina 3",
        extras: [{ name: "Stiker 3D", quantity: 1 }],
      });
      expect(e.total).toBeNull();
      expect(e.unknown).toBe(true);
      expect(e.knownAddonsTotal).toBe(700);
    });

    it("više poznatih dodataka i dalje ne daje cenu termina", () => {
      const e = estimateServicePrice({
        service: svc({
          type: "single",
          priceMode: "on_request",
          duration: 120,
          extras: [stiker3d, cirkoni],
        }),
        extras: [
          { name: "Stiker 3D", quantity: 1 },
          { name: "Cirkoni", quantity: 1 },
        ],
      });
      expect(e.total).toBeNull();
      expect(e.knownAddonsTotal).toBe(900);
    });

    it("dodatak na upit pored baze na upit ne menja ishod", () => {
      const e = estimateServicePrice({
        service: svc({
          type: "single",
          priceMode: "on_request",
          duration: 120,
          extras: [sirenaNaUpit, stiker3d],
        }),
        extras: [
          { name: "Morska sirena", quantity: 1 },
          { name: "Stiker 3D", quantity: 1 },
        ],
      });
      expect(e.total).toBeNull();
      expect(e.knownAddonsTotal).toBe(700);
    });
  });

  describe("FROM — minimum ostaje brojiv", () => {
    it("REGRESIJA: 2000 + 700 = minimum 2700", () => {
      const e = estimateServicePrice({
        service: svc({
          type: "single",
          priceMode: "from",
          basePrice: 2000,
          duration: 120,
          extras: [stiker3d],
        }),
        extras: [{ name: "Stiker 3D", quantity: 1 }],
      });
      expect(e.total).toBe(2700);
      expect(e.isEstimate).toBe(true);
      expect(e.unknown).toBe(false);
      expect(e.knownAddonsTotal).toBe(700);
      expect(e.mode).toBe("from");
    });

    it("varijanta na upit ne ruši minimum sa korena", () => {
      const e = estimateServicePrice({
        service: svc({
          type: "variant",
          priceMode: "from",
          basePrice: 2000,
          duration: 120,
          variants: [
            {
              name: "Veličina 3",
              price: 0,
              priceMode: "on_request",
              duration: 120,
              perItem: false,
            },
          ],
          extras: [stiker3d],
        }),
        variantName: "Veličina 3",
        extras: [{ name: "Stiker 3D", quantity: 1 }],
      });
      expect(e.total).toBe(2700);
      expect(e.unknown).toBe(false);
      expect(e.isEstimate).toBe(true);
    });
  });

  describe("FIXED — ponašanje nepromenjeno", () => {
    it("tačan zbir, bez „od“", () => {
      const e = estimateServicePrice({
        service: svc({
          type: "single",
          basePrice: 2000,
          duration: 120,
          extras: [stiker3d],
        }),
        extras: [{ name: "Stiker 3D", quantity: 1 }],
      });
      expect(e.total).toBe(2700);
      expect(e.isEstimate).toBe(false);
      expect(e.unknown).toBe(false);
      expect(e.mode).toBe("fixed");
    });

    it("više fiksnih dodataka se sabira tačno", () => {
      const e = estimateServicePrice({
        service: svc({
          type: "single",
          basePrice: 2000,
          duration: 120,
          extras: [stiker3d, cirkoni],
        }),
        extras: [
          { name: "Stiker 3D", quantity: 1 },
          { name: "Cirkoni", quantity: 1 },
        ],
      });
      expect(e.knownAddonsTotal).toBe(900);
      expect(e.total).toBe(2900);
      expect(e.isEstimate).toBe(false);
    });

    it("količina se poštuje samo kod dodataka sa `allowQuantity`", () => {
      const e = estimateServicePrice({
        service: svc({
          type: "single",
          basePrice: 2000,
          duration: 120,
          extras: [
            { ...stiker3d, allowQuantity: true },
            cirkoni, // bez allowQuantity → uvek 1
          ],
        }),
        extras: [
          { name: "Stiker 3D", quantity: 2 },
          { name: "Cirkoni", quantity: 3 },
        ],
      });
      expect(e.knownAddonsTotal).toBe(1600); // 2×700 + 1×200
      expect(e.total).toBe(3600);
    });

    it("dodatak na upit pretvara tačnu cenu u donju granicu", () => {
      const e = estimateServicePrice({
        service: svc({
          type: "single",
          basePrice: 2000,
          duration: 120,
          extras: [sirenaNaUpit],
        }),
        extras: [{ name: "Morska sirena", quantity: 1 }],
      });
      expect(e.total).toBe(2000);
      expect(e.isEstimate).toBe(true);
      expect(e.unknown).toBe(false);
    });

    it("fiksna varijanta zadržava punu cenu", () => {
      const e = estimateServicePrice({
        service: svc({
          type: "variant",
          basePrice: 9999,
          variants: [
            { name: "Korekcija", price: 2500, duration: 90, perItem: false },
          ],
          extras: [stiker3d],
        }),
        variantName: "Korekcija",
        extras: [{ name: "Stiker 3D", quantity: 1 }],
      });
      expect(e.total).toBe(3200);
      expect(e.mode).toBe("fixed");
    });
  });
});

describe("varijanta nije izabrana: to nije isto sto i cena na upit", () => {
  /** lashroom-byanja slučaj: sve varijante imaju fiksnu cenu. */
  const fiksneVarijante = svc({
    name: "L volumen",
    type: "variant",
    variants: [
      { name: "Novi set", price: 3500, duration: 120, perItem: false },
      { name: "Korekcija", price: 2500, duration: 90, perItem: false },
    ],
  });

  it("bez izabrane varijante NE tvrdi da je cena na upit", () => {
    const e = estimateServicePrice({ service: fiksneVarijante });

    // Cena se ne zna, ali razlog nije to sto salon tek treba da javi cenu.
    expect(e.total).toBeNull();
    expect(e.unknown).toBe(true);
    expect(e.pendingSelection).toBe(true);
    // Rezim ostaje fiksan: usluga cenu IMA, samo se ne zna koja.
    expect(e.mode).toBe("fixed");
  });

  it("čim se varijanta označi, cena se pojavi i čekanje prestaje", () => {
    const e = estimateServicePrice({
      service: fiksneVarijante,
      variantName: "Korekcija",
    });

    expect(e.total).toBe(2500);
    expect(e.unknown).toBe(false);
    expect(e.pendingSelection).toBe(false);
    expect(e.durationMinutes).toBe(90);
  });

  it("varijanta koja stvarno nema cenu i dalje je na upit", () => {
    const e = estimateServicePrice({
      service: svc({
        type: "variant",
        variants: [
          { name: "Standard", price: 2000, duration: 60, perItem: false },
          {
            name: "Po dogovoru",
            price: 0,
            priceMode: "on_request",
            duration: 60,
            perItem: false,
          },
        ],
      }),
      variantName: "Po dogovoru",
    });

    expect(e.total).toBeNull();
    expect(e.mode).toBe("on_request");
    // Izbor JE napravljen: ovo je stvarno na upit, ne cekanje izbora.
    expect(e.pendingSelection).toBe(false);
  });

  it("marysoll.makeup slucaj: SVE varijante na upit -> na upit i pre izbora", () => {
    // Ishod ne zavisi od izbora, pa je tvrdnja tačna već sada.
    const e = estimateServicePrice({
      service: svc({
        type: "variant",
        variants: [
          { name: "Svadba", price: 0, priceMode: "on_request", duration: 90, perItem: false },
          { name: "Maturska", price: 0, priceMode: "on_request", duration: 60, perItem: false },
        ],
      }),
    });

    expect(e.mode).toBe("on_request");
    expect(e.pendingSelection).toBe(false);
    expect(e.unknown).toBe(true);
  });

  it("usluga bez varijanti nikad ne čeka izbor", () => {
    const fiksna = estimateServicePrice({
      service: svc({ type: "single", basePrice: 2000 }),
    });
    expect(fiksna.pendingSelection).toBe(false);

    const naUpit = estimateServicePrice({
      service: svc({ type: "single", basePrice: 0, priceMode: "on_request" }),
    });
    expect(naUpit.pendingSelection).toBe(false);
    expect(naUpit.mode).toBe("on_request");
  });

  it("od-usluga ima osnovnu cenu i pre izbora varijante", () => {
    const e = estimateServicePrice({
      service: svc({
        type: "variant",
        priceMode: "from",
        basePrice: 2000,
        variants: [
          { name: "Veličina 1", price: 0, additionalPrice: 300, duration: 120, perItem: false },
        ],
      }),
    });
    expect(e.total).toBe(2000);
    expect(e.pendingSelection).toBe(false);
  });
});
