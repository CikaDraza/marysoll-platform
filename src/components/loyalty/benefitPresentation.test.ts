/**
 * T1-4 §15/§30 — kada se post-booking ekran sa pogodnostima SME pojaviti.
 *
 * Zakazivanje ne sme da zavisi od nagrada: ako pogodnosti nema, ako je već
 * primenjena ili ako program ne radi, korisnica dobija normalnu potvrdu
 * termina i ništa više.
 */
import { describe, expect, it } from "vitest";
import { canReplaceBenefit, shouldOfferBenefits } from "./benefitPresentation";

const usable = { enabled: true, hasUsable: true, applied: null, editable: true };

describe("shouldOfferBenefits", () => {
  it("otvara se kada server kaže da ima šta da se iskoristi", () => {
    expect(shouldOfferBenefits(usable)).toBe(true);
  });

  it("ne otvara se dok odgovor servera nije stigao", () => {
    expect(shouldOfferBenefits(undefined)).toBe(false);
    expect(shouldOfferBenefits(null)).toBe(false);
  });

  it("ne otvara se bez ijedne upotrebljive pogodnosti", () => {
    expect(shouldOfferBenefits({ ...usable, hasUsable: false })).toBe(false);
  });

  it("ne otvara se kada program nije aktivan", () => {
    expect(shouldOfferBenefits({ ...usable, enabled: false })).toBe(false);
  });

  it("ne nudi drugu pogodnost kada jedna već stoji — nema stackovanja", () => {
    expect(
      shouldOfferBenefits({ ...usable, applied: { voucherId: "v1" } }),
    ).toBe(false);
  });
});

describe("canReplaceBenefit", () => {
  it("zamena je moguća samo dok je termin otvoren", () => {
    expect(
      canReplaceBenefit({ ...usable, applied: { voucherId: "v1" }, editable: true }),
    ).toBe(true);
    expect(
      canReplaceBenefit({ ...usable, applied: { voucherId: "v1" }, editable: false }),
    ).toBe(false);
  });

  it("bez primenjene pogodnosti nema šta da se zameni", () => {
    expect(canReplaceBenefit(usable)).toBe(false);
  });
});
