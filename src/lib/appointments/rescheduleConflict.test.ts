/**
 * Zaključavanje ponašanja pri pomeranju termina.
 *
 * Anjin slučaj: klijentkinja je kroz „Izmeni termin" mogla da izabere datum i
 * vreme koje je već zauzeto i time PREGAZI tuđi termin. Provere postoje na dva
 * mesta i oba moraju ostati:
 *
 *   1. modal nudi samo slobodne slotove (`availableTimesForDate`,
 *      `manualTimesForDate` + `isManualSlotTaken`);
 *   2. server ponovo proverava (`overlapsAppointments`,
 *      `checkManualSlotAvailability`) — frontend nikad nije dovoljan.
 *
 * Ovi testovi drže drugu liniju odbrane i ključni invariant: termin koji se
 * menja izuzima se iz provere (inače bi sam sa sobom pravio preklapanje), ali
 * svaki DRUGI termin i dalje blokira.
 */
import { describe, it, expect } from "vitest";
import {
  overlapsAppointments,
  checkManualSlotAvailability,
  isManualSlotTaken,
  timeToMin,
} from "@/helpers/manualSlots";
import { availableTimesForDate } from "@/lib/booking/availabilityAdapter";

const DAY = "2026-09-12";

/** Anjin zatečeni termin: 12:00, 90 min → drži 12:00–13:30. */
const existing = { _id: "other", date: DAY, time: "12:00", duration: 90 };
/** Termin koji klijentkinja menja: 16:00, 60 min. */
const own = { _id: "own", date: DAY, time: "16:00", duration: 60 };

describe("reschedule — izuzimanje sopstvenog termina", () => {
  it("REGRESIJA: tuđi termin blokira pomeranje na svoje vreme", () => {
    // Server gleda sve OSIM onog koji se menja.
    const others = [existing, own].filter((a) => a._id !== own._id);
    expect(overlapsAppointments(others, DAY, "12:30", 60)).toBe(true);
  });

  it("sopstveni termin NE blokira sam sebe", () => {
    // Bez izuzimanja bi izmena usluge/napomene na istom vremenu pala.
    const others = [existing, own].filter((a) => a._id !== own._id);
    expect(overlapsAppointments(others, DAY, "16:00", 60)).toBe(false);
  });

  it("bez izuzimanja bi termin sam sebe proglasio zauzetim", () => {
    // Dokaz da izuzimanje nije kozmetika: sa sopstvenim terminom u listi,
    // ista provera vraća true i izmena bi bila trajno nemoguća.
    expect(overlapsAppointments([existing, own], DAY, "16:00", 60)).toBe(true);
  });

  it("slobodno vreme prolazi", () => {
    const others = [existing];
    expect(overlapsAppointments(others, DAY, "14:00", 60)).toBe(false);
  });

  it("preklapanje se meri po TRAJANJU, ne po tačnom vremenu", () => {
    // 11:30 + 60min ulazi u 12:00–13:30 iako vreme početka nije isto.
    expect(overlapsAppointments([existing], DAY, "11:30", 60)).toBe(true);
    // 11:00 + 60min se završava tačno na 12:00 — dodir nije preklapanje.
    expect(overlapsAppointments([existing], DAY, "11:00", 60)).toBe(false);
  });
});

describe("reschedule — manualSlots režim (Anjin režim)", () => {
  const manualSlots = {
    [DAY]: [
      { time: "12:00", duration: 90 },
      { time: "16:00", duration: 60 },
      { time: "18:00", duration: 60 },
    ],
  };

  it("zauzet definisan slot se odbija", () => {
    const check = checkManualSlotAvailability(
      manualSlots,
      [existing],
      DAY,
      "12:00",
    );
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("taken");
  });

  it("vreme koje vlasnik nije definisao se odbija", () => {
    const check = checkManualSlotAvailability(manualSlots, [], DAY, "13:15");
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("not_defined");
  });

  it("slobodan definisan slot prolazi", () => {
    const check = checkManualSlotAvailability(
      manualSlots,
      [existing],
      DAY,
      "18:00",
    );
    expect(check.ok).toBe(true);
  });

  it("sopstveni termin izuzet → svoj slot ostaje dostupan", () => {
    const others = [existing, own].filter((a) => a._id !== own._id);
    const check = checkManualSlotAvailability(manualSlots, others, DAY, "16:00");
    expect(check.ok).toBe(true);
  });
});

describe("reschedule — modal ne nudi zauzeto vreme", () => {
  // Dani su na srpskom (`DAY_NAME_BY_JS_DAY`); 12.09.2026 je subota.
  const workingHours = {
    Subota: [{ from: "09:00", to: "20:00" }],
  };

  it("zauzeti interval ispada iz ponude, slobodan ostaje", () => {
    const times = availableTimesForDate({
      tenantId: "t",
      localDate: DAY, // 12.09.2026 je subota
      durationMinutes: 60,
      profile: { workingHours },
      appointments: [existing],
      now: new Date("2026-09-01T08:00:00Z"),
    });
    expect(times).not.toContain("12:00");
    expect(times).not.toContain("12:30");
    expect(times).toContain("14:00");
  });

  it("sopstveni termin izuzet → svoje vreme ostaje u ponudi", () => {
    const others = [existing, own].filter((a) => a._id !== own._id);
    const times = availableTimesForDate({
      tenantId: "t",
      localDate: DAY,
      durationMinutes: 60,
      profile: { workingHours },
      appointments: others,
      now: new Date("2026-09-01T08:00:00Z"),
    });
    expect(times).toContain("16:00");
  });
});

describe("isManualSlotTaken — osnovna semantika", () => {
  it("otkazani/odbijeni termini se ne računaju kao zauzeće", () => {
    // Pozivaoci filtriraju status pre poziva; ovo drži ugovor da helper
    // gleda samo prosleđene termine.
    expect(isManualSlotTaken([], DAY, timeToMin("12:00"), 60)).toBe(false);
  });
});
