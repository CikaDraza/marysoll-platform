/**
 * Ugovor rute `/api/appointments/update/[id]`.
 *
 * Ova ruta je bila poslednje mesto na kojem je browser bio autoritet:
 * `AdminEditModal` je sam računao cenu i trajanje, slao ih u `updatedData`, a
 * ruta ih je prosleđivala pravo u `findOneAndUpdate` — bez ijedne provere
 * zauzeća. Izmena termina je mogla da sleti tačno na tuđi termin.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "src/app/api/appointments/update/[id]/route.ts",
  "utf8",
);

describe("admin izmena termina", () => {
  it("izbor usluge prolazi kroz canonical resolver", () => {
    expect(source).toMatch(/resolveCanonicalSelection\(/);
  });

  it("trajanje i cena se prepisuju iz kataloga, ne iz payload-a", () => {
    expect(source).toMatch(/updatedData\.duration = canonical\.durationMinutes/);
    expect(source).toMatch(/updatedData\.services = \[canonical\.item\]/);
  });

  it("usluga se razrešava u scope-u TERMINA, ne iz zahteva", () => {
    expect(source).toMatch(/tenantId: String\(appointment\.tenantId\)/);
  });

  it("REGRESIJA: pomeranje na zauzet termin se odbija sa 409", () => {
    expect(source).toMatch(/ACTIVE_APPOINTMENT_STATUS_FILTER/);
    expect(source).toMatch(/status: 409/);
  });

  it("provera zauzeća izuzima sam termin koji se pomera", () => {
    expect(source).toMatch(/_id: \{ \$ne: appointment\._id \}/);
  });

  it("sirov `pricing` iz browsera se i dalje briše", () => {
    expect(source).toMatch(/delete raw\.pricing/);
  });
});

describe("odluka o predlogu", () => {
  it("prihvatanje ide kroz proveru dostupnosti", () => {
    expect(source).toMatch(/evaluateProposalDecision\(/);
  });

  it("predlog se briše `$unset`-om, ne dodelom `undefined`", () => {
    // `$unset` sada nosi i brisanje pogodnosti (T1-4), pa se poziva kao
    // spread — invariant je da CLEAR_PROPOSAL_UNSET ide u `$unset`, ne da
    // stoji baš u tom obliku.
    expect(source).toMatch(/\$unset:[\s\S]{0,200}CLEAR_PROPOSAL_UNSET/);
    expect(source).not.toMatch(/updatedData\.proposedDate = undefined/);
  });

  it("REGRESIJA: odluku dobija SALON, ne klijentkinja sama sebi", () => {
    // Ranije: `Notification.create({ recipientProfileId: clientProfileId })`
    // sa tekstom „Klijent je prihvatio termin".
    expect(source).toMatch(/notifyProposalDecision\(/);
    expect(source).not.toMatch(/recipientProfileId: appointment\.clientProfileId/);
  });

  it("odbijen predlog se ne prijavljuje kao otkazan termin", () => {
    expect(source).toMatch(/proposalDecision:/);
    expect(source).not.toMatch(/"cancelled",\s*\{\s*sender: "client"/);
  });
});

describe("predlog cene", () => {
  it("browser ne može direktno da upiše priceProposal", () => {
    expect(source).toMatch(/delete raw\.priceProposal/);
  });

  it("promenljiva cena ostaje predlog dok je klijentkinja ne prihvati", () => {
    expect(source).toMatch(/createPriceProposal\(/);
    expect(source).toMatch(/delete updatedData\.status/);
    expect(source).toMatch(/evaluatePriceProposalDecision\(/);
  });

  it("predlog se briše eksplicitnim `$unset`-om posle odluke", () => {
    expect(source).toMatch(/\$unset:[\s\S]{0,300}CLEAR_PRICE_PROPOSAL_UNSET/);
  });

  it("odluka je uska komanda i atomic je vezana za viđeni predlog", () => {
    expect(source).toMatch(/key !== "lastUpdatedBy"/);
    expect(source).toMatch(/"priceProposal\.proposedAt"/);
    expect(source).toMatch(/Predlog cene je u međuvremenu promenjen/);
  });
});

describe("klijent ne menja status mimo predloga", () => {
  it("REGRESIJA: samo-odobravanje termina se odbija", () => {
    expect(source).toMatch(/!isAdmin[\s\S]{0,100}!decidesProposal/);
    expect(source).toMatch(/!decidesPriceProposal/);
    expect(source).toMatch(/Status termina menja salon/);
  });

  it("completion i no-show ostaju admin akcije", () => {
    expect(source).toMatch(
      /Samo salon može označiti termin kao završen ili propušten/,
    );
  });
});

describe("admin zakazivanje (create-guest)", () => {
  const guest = readFileSync(
    "src/app/api/appointments/create-guest/route.ts",
    "utf8",
  );

  it("usluga se traži tenant-scoped, ne globalnim findById", () => {
    expect(guest).toMatch(/resolveCanonicalSelection\(/);
    expect(guest).not.toMatch(/Service\.findById\(serviceId\)/);
  });

  it("termin dobija canonical pricing snapshot", () => {
    expect(guest).toMatch(/pricing: canonical\.pricing/);
  });

  it("trajanje iz forme se ne upisuje", () => {
    expect(guest).toMatch(/duration: canonical\.durationMinutes/);
    expect(guest).not.toMatch(/duration: duration \|\| service\.duration/);
  });
});
