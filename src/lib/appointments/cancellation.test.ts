/**
 * Rok za klijentske akcije — granice i zona.
 *
 * Regresija koju ovi testovi zaključavaju: rok se ranije računao od
 * `createdAt + N sati`, pa je klijentkinja koja zakaže tri dana unapred gubila
 * pravo na otkazivanje sat vremena POSLE rezervacije.
 */
import { describe, it, expect } from "vitest";
import {
  clientAppointmentPhase,
  canClientEditAppointment,
  canClientCancelAppointment,
  canClientCancelLate,
  getCancellationCutoff,
  hasAppointmentStarted,
  isClientActionableStatus,
} from "./cancellation";

/** Termin 12.09.2026 u 14:00 po Beogradu (leto, UTC+2 → 12:00Z). */
const appt = { date: "2026-09-12", time: "14:00", cancellationWindowHours: 24 };
const START = new Date("2026-09-12T12:00:00Z");
const CUTOFF = new Date("2026-09-11T12:00:00Z");

describe("getCancellationCutoff", () => {
  it("rok je početak termina minus prozor, u zoni salona", () => {
    expect(getCancellationCutoff(appt)?.toISOString()).toBe(
      CUTOFF.toISOString(),
    );
  });

  it("REGRESIJA: rok NE zavisi od trenutka rezervacije", () => {
    // Isti termin, „rezervisan" bilo kad — rok mora biti isti.
    const cutoff = getCancellationCutoff({ ...appt })?.getTime();
    expect(cutoff).toBe(CUTOFF.getTime());
  });

  it("zimsko vreme pomera instant za sat (UTC+1)", () => {
    // 12.01.2026 u 14:00 po Beogradu = 13:00Z, rok 24h ranije = 13:00Z prethodnog dana.
    const winter = { date: "2026-01-12", time: "14:00", cancellationWindowHours: 24 };
    expect(getCancellationCutoff(winter)?.toISOString()).toBe(
      "2026-01-11T13:00:00.000Z",
    );
  });

  it("prozor 0 znači rok tačno na početku termina", () => {
    expect(
      getCancellationCutoff({ ...appt, cancellationWindowHours: 0 })?.getTime(),
    ).toBe(START.getTime());
  });

  it("nevalidan prozor pada na podrazumevani 1h", () => {
    const cutoff = getCancellationCutoff({
      ...appt,
      cancellationWindowHours: -5,
    });
    expect(cutoff?.getTime()).toBe(START.getTime() - 60 * 60 * 1000);
  });
});

describe("clientAppointmentPhase", () => {
  it("pre roka → open", () => {
    const now = new Date(CUTOFF.getTime() - 60_000);
    expect(clientAppointmentPhase(appt, now)).toBe("open");
    expect(canClientEditAppointment(appt, now)).toBe(true);
    expect(canClientCancelAppointment(appt, now)).toBe(true);
    expect(canClientCancelLate(appt, now)).toBe(false);
  });

  it("TAČNO na roku → još uvek open (granica je uključiva)", () => {
    expect(clientAppointmentPhase(appt, CUTOFF)).toBe("open");
    expect(canClientEditAppointment(appt, CUTOFF)).toBe(true);
  });

  it("sekund posle roka → late: izmena zabranjena, otkazivanje dostupno", () => {
    const now = new Date(CUTOFF.getTime() + 1000);
    expect(clientAppointmentPhase(appt, now)).toBe("late");
    expect(canClientEditAppointment(appt, now)).toBe(false);
    expect(canClientCancelAppointment(appt, now)).toBe(false);
    expect(canClientCancelLate(appt, now)).toBe(true);
  });

  it("sekund pre početka → i dalje late", () => {
    const now = new Date(START.getTime() - 1000);
    expect(clientAppointmentPhase(appt, now)).toBe("late");
    expect(canClientCancelLate(appt, now)).toBe(true);
  });

  it("TAČNO na početku → started, klijent više ništa ne može", () => {
    expect(clientAppointmentPhase(appt, START)).toBe("started");
    expect(canClientEditAppointment(appt, START)).toBe(false);
    expect(canClientCancelLate(appt, START)).toBe(false);
  });

  it("dva sata posle termina → started, ne „otkazivanje“", () => {
    const now = new Date(START.getTime() + 2 * 60 * 60 * 1000);
    expect(clientAppointmentPhase(appt, now)).toBe("started");
    expect(canClientCancelLate(appt, now)).toBe(false);
  });

  it("FAIL-SAFE: nečitljivo vreme ne autorizuje nijednu akciju", () => {
    // Rok je autorizaciona odluka. Bez pouzdanog početka termina ne sme se
    // pisati u bazu na osnovu pretpostavke — ni otkazivanje ni pomeranje.
    for (const broken of [
      { date: "", time: "", cancellationWindowHours: 24 },
      { date: "2026-09-12", time: "", cancellationWindowHours: 24 },
      { date: "", time: "14:00", cancellationWindowHours: 24 },
      { date: "2026-09-12", time: "ne-vreme", cancellationWindowHours: 24 },
    ]) {
      const now = new Date();
      expect(clientAppointmentPhase(broken, now)).toBe("unknown");
      expect(canClientEditAppointment(broken, now)).toBe(false);
      expect(canClientCancelAppointment(broken, now)).toBe(false);
      expect(canClientCancelLate(broken, now)).toBe(false);
    }
  });
});

describe("hasAppointmentStarted", () => {
  it("koristi zonu salona, ne zonu procesa", () => {
    expect(hasAppointmentStarted(appt, new Date(START.getTime() - 1000))).toBe(false);
    expect(hasAppointmentStarted(appt, START)).toBe(true);
  });
});

describe("isClientActionableStatus", () => {
  it("završeni statusi ne prolaze kroz klijentske akcije", () => {
    for (const s of ["appointment_cancelled", "completed", "no_show"]) {
      expect(isClientActionableStatus(s)).toBe(false);
    }
  });

  it("aktivni statusi prolaze", () => {
    for (const s of ["pending", "appointment_approved", "appointment_rescheduled"]) {
      expect(isClientActionableStatus(s)).toBe(true);
    }
  });
});
