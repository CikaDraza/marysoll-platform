/**
 * Javni ugovor usluga — `ref` je dodat, ništa nije uklonjeno.
 *
 * Serijalizator nije izvezen (živi uz rutu), pa se ovde proverava OBLIK
 * odgovora nad istim ulazom kakav dolazi iz baze. Cilj je da Korak 2 dobije
 * stabilnu adresu, a da nijedan zatečeni klijent ne pukne.
 */
import { describe, it, expect } from "vitest";
import { subdocRef } from "@/lib/booking/subdocRef";

/** Isti oblik koji ruta pravi za ugnežđene delove. */
function serializeVariant(vv: Record<string, unknown>) {
  return {
    ref: subdocRef(vv),
    name: String(vv.name ?? ""),
    price: Number(vv.price ?? 0),
    duration: Number(vv.duration ?? 0),
    perItem: Boolean(vv.perItem),
  };
}

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
    expect(subdocRef(rawExtra)).toBe("69dffbf13ec6da0633f1c866");
    expect(subdocRef(rawExtra)).not.toBe(subdocRef(rawVariant));
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
