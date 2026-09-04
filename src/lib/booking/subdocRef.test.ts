/**
 * `ref` je most između javnog booking ugovora i Booking Engine-a.
 *
 * Engine adresira delove usluge preko `variantRef` / `extraRefs` / `itemRefs`,
 * a javni serijalizer je do sada brisao `_id` iz podnizova — pa browser nije
 * imao stabilnu adresu i engine se nije mogao priključiti. `ref` to zatvara,
 * bez izlaganja Mongo `_id` kao javnog polja.
 */
import { describe, it, expect } from "vitest";
import { subdocRef } from "./subdocRef";

describe("subdocRef", () => {
  it("vraća string adresu podokumenta", () => {
    expect(subdocRef({ _id: "69dffbf13ec6da0633f1c865" })).toBe(
      "69dffbf13ec6da0633f1c865",
    );
  });

  it("ObjectId se serijalizuje u string, ne u objekat", () => {
    // Mongoose vraća ObjectId; `[object Object]` u URL-u/payloadu je već
    // jednom bio bug (deep-link iz notifikacije).
    const objectIdLike = { toString: () => "69dffbf13ec6da0633f1c866" };
    const ref = subdocRef({ _id: objectIdLike });
    expect(ref).toBe("69dffbf13ec6da0633f1c866");
    expect(ref).not.toContain("[object");
  });

  it("podokument bez _id daje prazan ref, ne „undefined“", () => {
    expect(subdocRef({ name: "Nail Art" })).toBe("");
    expect(subdocRef({ _id: null })).toBe("");
  });

  it("različiti podokumenti daju različite ref-ove", () => {
    const a = subdocRef({ _id: "69dffbf13ec6da0633f1c865" });
    const b = subdocRef({ _id: "69dffbf13ec6da0633f1c866" });
    expect(a).not.toBe(b);
  });
});
