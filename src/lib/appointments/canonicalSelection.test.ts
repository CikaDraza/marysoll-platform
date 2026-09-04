/**
 * Otisak izbora odlučuje da li se potvrđena cena čuva ili poništava, pa mora
 * da razlikuje „isti izbor, drugi sat" od „druga usluga".
 */
import { describe, expect, it } from "vitest";
import {
  selectionFromAppointmentItem,
  selectionSignature,
  signatureOfAppointmentItem,
} from "./canonicalSelection";
import type { IAppointmentService } from "@/types";

const SERVICE = "651f1f77bcf86cd799439011";

function item(overrides: Partial<IAppointmentService> = {}): IAppointmentService {
  return {
    serviceId: SERVICE,
    serviceName: "Veličina 3",
    quantity: 1,
    price: 2700,
    duration: 130,
    variants: [{ name: "Veličina 3", price: 2000, duration: 120, perItem: false }],
    extras: [
      { name: "Stiker 3D", price: 700, duration: 10, perItem: true, quantity: 2 },
    ],
    ...overrides,
  };
}

describe("otisak izbora", () => {
  it("isti izbor daje isti otisak", () => {
    expect(signatureOfAppointmentItem(item())).toBe(
      signatureOfAppointmentItem(item()),
    );
  });

  it("promena varijante menja otisak", () => {
    const drugaVarijanta = item({
      variants: [{ name: "Veličina 5", price: 2800, duration: 150, perItem: false }],
    });
    expect(signatureOfAppointmentItem(drugaVarijanta)).not.toBe(
      signatureOfAppointmentItem(item()),
    );
  });

  it("promena količine dodatka menja otisak", () => {
    const triKomada = item({
      extras: [
        { name: "Stiker 3D", price: 700, duration: 10, perItem: true, quantity: 3 },
      ],
    });
    expect(signatureOfAppointmentItem(triKomada)).not.toBe(
      signatureOfAppointmentItem(item()),
    );
  });

  it("redosled dodataka ne menja otisak", () => {
    const a = selectionSignature({
      serviceId: SERVICE,
      extras: [{ name: "Crtež" }, { name: "Stiker 3D" }],
    });
    const b = selectionSignature({
      serviceId: SERVICE,
      extras: [{ name: "Stiker 3D" }, { name: "Crtež" }],
    });
    expect(a).toBe(b);
  });

  it("promena CENE u cenovniku ne menja otisak", () => {
    // Ako salon poskupi dodatak, a klijentkinja samo pomeri termin, to nije
    // nov izbor — dogovorena cena se ne sme prepisati novom.
    const poskupelo = item({
      extras: [
        { name: "Stiker 3D", price: 900, duration: 10, perItem: true, quantity: 2 },
      ],
    });
    expect(signatureOfAppointmentItem(poskupelo)).toBe(
      signatureOfAppointmentItem(item()),
    );
  });

  it("prazna stavka daje prazan otisak umesto pada", () => {
    expect(signatureOfAppointmentItem(null)).toBe("");
    expect(signatureOfAppointmentItem(undefined)).toBe("");
  });
});

describe("izbor iz zatečenog termina", () => {
  it("varijanta se čita iz `variants`, ne iz imena stavke", () => {
    const selection = selectionFromAppointmentItem(item());
    expect(selection.variantName).toBe("Veličina 3");
    expect(selection.extras).toEqual([{ name: "Stiker 3D", quantity: 2 }]);
  });

  it("stari termini bez `variants` padaju na ime stavke", () => {
    // Termini zakazani pre nego što je izbor počeo da se čuva.
    const legacy = selectionFromAppointmentItem(
      item({ variants: undefined, extras: undefined }),
    );
    expect(legacy.variantName).toBe("Veličina 3");
    expect(legacy.extras).toEqual([]);
  });

  it("dodatak bez količine se čita kao jedan", () => {
    const selection = selectionFromAppointmentItem(
      item({
        extras: [{ name: "Crtež", price: 300, duration: 5, perItem: false }],
      }),
    );
    expect(selection.extras).toEqual([{ name: "Crtež", quantity: 1 }]);
  });
});
