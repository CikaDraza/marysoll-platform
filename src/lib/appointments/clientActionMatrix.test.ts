/**
 * Action matrica za „Moji termini" — koja dugmad klijentkinja vidi.
 *
 * Komponenta NE računa vreme ponovo; sve izvodi iz `clientAppointmentPhase` i
 * `isClientActionableStatus`. Ovi testovi drže tu matricu na domenskom nivou,
 * pa promena pravila ne može tiho da razmimoiđe UI i server.
 */
import { describe, it, expect } from "vitest";
import {
  clientAppointmentPhase,
  isClientActionableStatus,
} from "./cancellation";

const appt = { date: "2026-09-12", time: "14:00", cancellationWindowHours: 24 };
const START = new Date("2026-09-12T12:00:00Z");
const CUTOFF = new Date("2026-09-11T12:00:00Z");

/** Ista pravila koja primenjuje kartica termina. */
function actions(
  a: { date: string; time: string; cancellationWindowHours?: number },
  status: string,
  now: Date,
) {
  const phase = isClientActionableStatus(status)
    ? clientAppointmentPhase(a, now)
    : "started";
  return {
    promeni: phase === "open",
    otkazi: phase === "open" || phase === "late",
  };
}

describe("action matrica", () => {
  it("1–2: open termin nudi Promeni i Otkaži", () => {
    const now = new Date(CUTOFF.getTime() - 60_000);
    expect(actions(appt, "appointment_approved", now)).toEqual({
      promeni: true,
      otkazi: true,
    });
  });

  it("3–4: late termin nudi SAMO Otkaži", () => {
    const now = new Date(CUTOFF.getTime() + 1000);
    expect(actions(appt, "appointment_approved", now)).toEqual({
      promeni: false,
      otkazi: true,
    });
  });

  it("5: započet termin ne nudi nijedno", () => {
    expect(actions(appt, "appointment_approved", START)).toEqual({
      promeni: false,
      otkazi: false,
    });
  });

  it("6: nečitljivo vreme ne nudi nijedno", () => {
    const broken = { date: "", time: "", cancellationWindowHours: 24 };
    expect(actions(broken, "appointment_approved", new Date())).toEqual({
      promeni: false,
      otkazi: false,
    });
  });

  it("7: završni statusi ne nude nijedno, ma koliko vremena ostalo", () => {
    const now = new Date(CUTOFF.getTime() - 60_000);
    for (const status of ["completed", "appointment_cancelled", "no_show"]) {
      expect(actions(appt, status, now)).toEqual({
        promeni: false,
        otkazi: false,
      });
    }
  });

  it("8: termin koji je admin pomerio zadržava klijentske akcije", () => {
    // `appointment_rescheduled` je aktivan status — approval tok se ne dira,
    // ali klijentkinja i dalje sme da menja/otkazuje dok je u roku.
    const now = new Date(CUTOFF.getTime() - 60_000);
    expect(actions(appt, "appointment_rescheduled", now)).toEqual({
      promeni: true,
      otkazi: true,
    });
  });

  it("pending termin se ponaša isto kao odobren", () => {
    const now = new Date(CUTOFF.getTime() - 60_000);
    expect(actions(appt, "pending", now)).toEqual({
      promeni: true,
      otkazi: true,
    });
  });
});
