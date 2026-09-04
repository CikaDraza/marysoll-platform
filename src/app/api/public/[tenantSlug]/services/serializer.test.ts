/**
 * Javni ugovor usluga — `ref` je dodat, ništa nije uklonjeno.
 *
 * Serijalizator nije izvezen (živi uz rutu), pa se ovde proverava OBLIK
 * odgovora nad istim ulazom kakav dolazi iz baze. Cilj je da Korak 2 dobije
 * stabilnu adresu, a da nijedan zatečeni klijent ne pukne.
 */
import { describe, it, expect } from "vitest";
import { toBookingServicePresentation } from "@/lib/booking/servicePresentation";

const rawVariant = {
  _id: "69dffbf13ec6da0633f1c865",
  name: "Veličina 3",
  price: 0,
  priceMode: "on_request",
  duration: 120,
  perItem: false,
};
const rawExtra = {
  _id: "69dffbf13ec6da0633f1c866",
  name: "Stiker 3D",
  price: 700,
  duration: 10,
  perItem: true,
};

describe("javni ugovor — ref uz postojeća polja", () => {
  const serializeVariant = (value: Record<string, unknown>) =>
    toBookingServicePresentation({
      _id: "service-1",
      name: "Izlivanje",
      category: "Nokti",
      type: "variant",
      variants: [value],
    }).variants![0];

  it("varijanta dobija ref", () => {
    expect(serializeVariant(rawVariant).ref).toBe("69dffbf13ec6da0633f1c865");
  });

  it("postojeća polja varijante nisu nestala", () => {
    const out = serializeVariant(rawVariant);
    expect(out.name).toBe("Veličina 3");
    expect(out.duration).toBe(120);
    expect(out).toHaveProperty("price");
    expect(out).toHaveProperty("perItem");
  });

  it("dodatak dobija svoj, različit ref", () => {
    const service = toBookingServicePresentation({
      _id: "service-1",
      name: "Izlivanje",
      category: "Nokti",
      variants: [rawVariant],
      extras: [rawExtra],
    });
    expect(service.extras?.[0].ref).toBe("69dffbf13ec6da0633f1c866");
    expect(service.extras?.[0].ref).not.toBe(service.variants?.[0].ref);
  });

  it("REGRESIJA: widget DTO rešava intake i ne izlaže persistence oblik", () => {
    const service = toBookingServicePresentation({
      _id: "service-1",
      name: "Izlivanje",
      category: "Nokti",
      bookingIntake: { enabled: true },
    });

    expect(service).toMatchObject({ intakeEnabled: true });
    expect(service).not.toHaveProperty("bookingIntake");
  });

  it("REGRESIJA: `_id` se NE izlaže kao javno polje", () => {
    // Namera serijalizera je da Mongo id ne bude deo javnog ugovora;
    // `ref` ga zamenjuje, ne dopunjuje.
    expect(serializeVariant(rawVariant)).not.toHaveProperty("_id");
  });

  it("ref je stabilan između dva serijalizovanja istog podokumenta", () => {
    expect(serializeVariant(rawVariant).ref).toBe(
      serializeVariant({ ...rawVariant }).ref,
    );
  });
});
