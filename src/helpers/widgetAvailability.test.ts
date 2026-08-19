import { describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import {
  findFirstAvailableDay,
  hasFreeSlot,
  toDateStr,
} from "./widgetAvailability";
import type { ManualSlotsMap, WorkingHoursMap } from "@/types";

// Salon radi svaki dan 09–17 (16 slotova po 30 min).
const ALL_DAY_HOURS = {
  Nedelja: [{ from: "09:00", to: "17:00" }],
  Ponedeljak: [{ from: "09:00", to: "17:00" }],
  Utorak: [{ from: "09:00", to: "17:00" }],
  Sreda: [{ from: "09:00", to: "17:00" }],
  Četvrtak: [{ from: "09:00", to: "17:00" }],
  Petak: [{ from: "09:00", to: "17:00" }],
  Subota: [{ from: "09:00", to: "17:00" }],
} as unknown as WorkingHoursMap;

/** Popuni ceo dan 09–17 jednim dugim terminom. */
function fullDay(day: Date) {
  return { date: toDateStr(day), time: "09:00", duration: 8 * 60 };
}

/** "Sutra" u 10:00 — uvek u budućnosti, nezavisno od trenutka izvršavanja testa. */
const tomorrow = () => addDays(new Date(), 1);

describe("findFirstAvailableDay — režim radnog vremena", () => {
  it("vraća sutrašnji dan kad su danas i sutra jedini kandidati, a danas je popunjen", () => {
    const today = new Date();
    const first = findFirstAvailableDay({
      workingHours: ALL_DAY_HOURS,
      manualSlots: undefined,
      isManual: false,
      appointments: [fullDay(today)],
    });
    expect(first && toDateStr(first)).toBe(toDateStr(tomorrow()));
  });

  it("preskače više uzastopnih popunjenih dana", () => {
    const booked = Array.from({ length: 5 }, (_, i) =>
      fullDay(addDays(new Date(), i)),
    );
    const first = findFirstAvailableDay({
      workingHours: ALL_DAY_HOURS,
      manualSlots: undefined,
      isManual: false,
      appointments: booked,
    });
    expect(first && toDateStr(first)).toBe(toDateStr(addDays(new Date(), 5)));
  });

  it("vraća null kad nema radnog vremena", () => {
    expect(
      findFirstAvailableDay({
        workingHours: undefined,
        manualSlots: undefined,
        isManual: false,
        appointments: [],
      }),
    ).toBeNull();
  });

  it("prošli termini se ne računaju kao slobodni", () => {
    const yesterday = addDays(new Date(), -1);
    expect(
      hasFreeSlot(yesterday, {
        workingHours: ALL_DAY_HOURS,
        manualSlots: undefined,
        isManual: false,
        appointments: [],
      }),
    ).toBe(false);
  });
});

describe("findFirstAvailableDay — režim pojedinačnih termina", () => {
  it("nalazi dan sa slobodnim ručnim terminom", () => {
    const day2 = addDays(new Date(), 2);
    const day3 = addDays(new Date(), 3);
    const manualSlots = {
      [toDateStr(day2)]: [{ time: "12:00", duration: 60 }],
      [toDateStr(day3)]: [{ time: "12:00", duration: 60 }],
    } as unknown as ManualSlotsMap;

    const first = findFirstAvailableDay({
      workingHours: ALL_DAY_HOURS,
      manualSlots,
      isManual: true,
      // Prvi ponuđeni termin je već zauzet → fokus ide na sledeći dan.
      appointments: [{ date: toDateStr(day2), time: "12:00", duration: 60 }],
    });
    expect(first && toDateStr(first)).toBe(toDateStr(day3));
  });

  it("ignoriše radno vreme kad je režim ručni (nema definisanih termina)", () => {
    expect(
      findFirstAvailableDay({
        workingHours: ALL_DAY_HOURS,
        manualSlots: {} as ManualSlotsMap,
        isManual: true,
        appointments: [],
      }),
    ).toBeNull();
  });
});
