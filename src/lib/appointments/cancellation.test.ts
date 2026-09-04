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
  BOOKING_GRACE_PERIOD_MINUTES,
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

describe("grace period — 30 minuta za ispravku greške", () => {
  /**
   * Salon ima rok od 24h, klijentkinja danas u 10:00 zakazuje za 15:00 —
   * dakle ODMAH je van salonovog roka. Grace period joj daje pola sata da
   * ispravi pogrešan klik bez `late_cancel` zapisa.
   */
  const CREATED = new Date("2026-09-12T08:00:00Z"); // 10:00 po Beogradu
  const shortNotice = {
    date: "2026-09-12",
    time: "15:00", // 13:00Z
    cancellationWindowHours: 24,
    createdAt: CREATED.toISOString(),
  };
  const START = new Date("2026-09-12T13:00:00Z");

  it("termin zakazan unutar roka je ODMAH van salonovog prozora", () => {
    // Dokaz da grace zaista nešto rešava: bez njega bi ovo bilo `late`.
    expect(getCancellationCutoff(shortNotice)!.getTime()).toBeLessThan(
      CREATED.getTime(),
    );
  });

  it("10:00–10:30 → open, puno pravo na izmenu i otkazivanje", () => {
    for (const minutes of [0, 1, 15, 29]) {
      const now = new Date(CREATED.getTime() + minutes * 60_000);
      expect(clientAppointmentPhase(shortNotice, now)).toBe("open");
      expect(canClientEditAppointment(shortNotice, now)).toBe(true);
      expect(canClientCancelAppointment(shortNotice, now)).toBe(true);
    }
  });

  it("TAČNO na 30. minutu je još uvek open (granica uključiva)", () => {
    const now = new Date(CREATED.getTime() + 30 * 60_000);
    expect(clientAppointmentPhase(shortNotice, now)).toBe("open");
  });

  it("posle 30 minuta važe pravila salona → late", () => {
    const now = new Date(CREATED.getTime() + 30 * 60_000 + 1000);
    expect(clientAppointmentPhase(shortNotice, now)).toBe("late");
    expect(canClientEditAppointment(shortNotice, now)).toBe(false);
    expect(canClientCancelLate(shortNotice, now)).toBe(true);
  });

  it("započet termin nema grace — ni u prvih 30 minuta", () => {
    // Rezervacija napravljena 10 minuta pre početka: grace bi trajao još 20,
    // ali termin je počeo i klijent ga više ne dira.
    const lastMinute = {
      ...shortNotice,
      createdAt: new Date(START.getTime() - 10 * 60_000).toISOString(),
    };
    expect(clientAppointmentPhase(lastMinute, START)).toBe("started");
    expect(canClientCancelLate(lastMinute, START)).toBe(false);
  });

  it("grace NE skraćuje salonov rok kad je on duži", () => {
    // Termin za tri dana: klijent ima pravo sve do 24h pre početka, mnogo
    // posle isteka grace perioda.
    const farAway = {
      date: "2026-09-15",
      time: "15:00",
      cancellationWindowHours: 24,
      createdAt: CREATED.toISOString(),
    };
    const dayAfter = new Date(CREATED.getTime() + 24 * 60 * 60_000);
    expect(clientAppointmentPhase(farAway, dayAfter)).toBe("open");
  });

  it("bez createdAt grace ne postoji, ali salonov rok i dalje važi", () => {
    const noCreatedAt = { ...shortNotice, createdAt: undefined };
    const now = new Date(CREATED.getTime() + 60_000);
    expect(clientAppointmentPhase(noCreatedAt, now)).toBe("late");

    const inWindow = { date: "2026-09-15", time: "15:00", cancellationWindowHours: 24 };
    expect(clientAppointmentPhase(inWindow, now)).toBe("open");
  });

  it("nevalidan createdAt ne ruši fazu", () => {
    const broken = { ...shortNotice, createdAt: "ne-datum" };
    const now = new Date(CREATED.getTime() + 60_000);
    expect(clientAppointmentPhase(broken, now)).toBe("late");
  });

  it("BOOKING_GRACE_PERIOD_MINUTES je 30", () => {
    expect(BOOKING_GRACE_PERIOD_MINUTES).toBe(30);
  });
});
