/**
 * Vlasnik odluke o zahtevu klijentkinje je USLUGA, ne kategorija.
 *
 * Do 2026-09-02 je odluku nosio `CATEGORY_MAP.nails.requiresIntake`, pa salon
 * nije mogao ni da uključi zahtev izvan noktiju ni da ga isključi za uslugu
 * noktiju kojoj ne treba. Poslednja dva testa su ključna — dokazuju da
 * kategorija više nije authority.
 */
import { describe, it, expect } from "vitest";
import {
  resolveServiceBookingIntake,
  serviceRequiresIntake,
} from "./serviceIntake";
import type { IService } from "@/types";

function svc(p: Partial<IService>): IService {
  return {
    _id: "s", name: "Usluga", category: "Nokti", categorySlug: "nails",
    type: "single", description: "", items: [],
    subscription: { enabled: false }, createdAt: "", updatedAt: "", ...p,
  } as IService;
}

describe("resolveServiceBookingIntake", () => {
  it("usluga bez konfiguracije → isključeno", () => {
    expect(resolveServiceBookingIntake(svc({})).enabled).toBe(false);
  });

  it("izričito isključeno → isključeno", () => {
    expect(
      serviceRequiresIntake(svc({ bookingIntake: { enabled: false } })),
    ).toBe(false);
  });

  it("izričito uključeno → uključeno", () => {
    expect(
      serviceRequiresIntake(svc({ bookingIntake: { enabled: true } })),
    ).toBe(true);
  });

  it("KLJUČNO: kategorija noktiju BEZ konfiguracije nema zahtev", () => {
    // Ranije bi `categorySlug: "nails"` sam po sebi uključio zahtev.
    const nails = svc({ categorySlug: "nails", category: "Nokti" });
    expect(serviceRequiresIntake(nails)).toBe(false);
  });

  it("KLJUČNO: šminka SA konfiguracijom ima zahtev", () => {
    // Ranije nijedna usluga van noktiju nije mogla da traži zahtev.
    const makeup = svc({
      categorySlug: "makeup",
      category: "Šminka",
      bookingIntake: { enabled: true },
    });
    expect(serviceRequiresIntake(makeup)).toBe(true);
  });

  it("kategorija noktiju sa izričitim `false` nema zahtev", () => {
    const nails = svc({
      categorySlug: "nails",
      bookingIntake: { enabled: false },
    });
    expect(serviceRequiresIntake(nails)).toBe(false);
  });

  it("nepostojeća usluga ne ruši resolver", () => {
    expect(serviceRequiresIntake(null)).toBe(false);
    expect(resolveServiceBookingIntake(undefined).enabled).toBe(false);
  });

  it("truthy vrednost koja nije `true` se ne prihvata", () => {
    // Strogo poređenje: `"da"` ili `1` iz pokvarenog payloada ne uključuju
    // poslovnu funkciju.
    const sneaky = svc({ bookingIntake: { enabled: 1 as never } });
    expect(serviceRequiresIntake(sneaky)).toBe(false);
  });
});
