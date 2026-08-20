/**
 * Ponašanje javnog widgeta, na novom šavu.
 *
 * Prenosi pokrivenost obrisanog `helpers/widgetAvailability.test.ts` — ista
 * pitanja („koji je prvi slobodan dan", „šta kad je sve popunjeno", „šta u
 * režimu ručnih termina"), samo sada nad jedinim izvorom pravila.
 *
 * Datumi su fiksni: stari test je računao od `new Date()`, pa bi pao na dan kad
 * se prelama ponoć ili kad dođe DST.
 */
import { describe, expect, it } from "vitest";
import type { WorkingHoursMap } from "@/types";
import { firstAvailableDate, widgetDay, type WidgetAvailabilityArgs } from "./widgetDay";

/** Salon radi svaki dan 09–17 (16 termina po 30 min). */
const ALL_DAY_HOURS = {
  Nedelja: [{ from: "09:00", to: "17:00" }],
  Ponedeljak: [{ from: "09:00", to: "17:00" }],
  Utorak: [{ from: "09:00", to: "17:00" }],
  Sreda: [{ from: "09:00", to: "17:00" }],
  Četvrtak: [{ from: "09:00", to: "17:00" }],
  Petak: [{ from: "09:00", to: "17:00" }],
  Subota: [{ from: "09:00", to: "17:00" }],
} as unknown as WorkingHoursMap;

const DAY_1 = "2026-08-24";
const DAY_2 = "2026-08-25";
/** Pre radnog vremena prvog dana — ništa nije prošlo. */
const MORNING = new Date("2026-08-24T05:00:00Z");

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Popuni ceo dan 09–17 jednim dugim terminom. */
function fullDay(date: string) {
  return { date, time: "09:00", duration: 8 * 60 };
}

function args(over: Partial<WidgetAvailabilityArgs> = {}): WidgetAvailabilityArgs {
  return {
    workingHours: ALL_DAY_HOURS,
    manualSlots: undefined,
    isManual: false,
    appointments: [],
    now: MORNING,
    ...over,
  };
}

describe("firstAvailableDate — režim radnog vremena", () => {
  it("vraća sutra kad je danas popunjen", () => {
    expect(
      firstAvailableDate(args({ appointments: [fullDay(DAY_1)] }), DAY_1),
    ).toBe(DAY_2);
  });

  it("preskače više uzastopnih popunjenih dana", () => {
    const booked = Array.from({ length: 5 }, (_, i) => fullDay(addDays(DAY_1, i)));
    expect(firstAvailableDate(args({ appointments: booked }), DAY_1)).toBe(
      addDays(DAY_1, 5),
    );
  });

  it("vraća null kad nema radnog vremena", () => {
    expect(firstAvailableDate(args({ workingHours: undefined }), DAY_1)).toBeNull();
  });

  it("prošli termini se ne računaju kao slobodni", () => {
    // 15:00 po Beogradu — ostaje samo 15:00–17:00, dakle dan je i dalje slobodan.
    expect(
      firstAvailableDate(args({ now: new Date("2026-08-24T13:00:00Z") }), DAY_1),
    ).toBe(DAY_1);

    // Posle radnog vremena — dan više nema šta da ponudi, ide se na sutra.
    expect(
      firstAvailableDate(args({ now: new Date("2026-08-24T20:00:00Z") }), DAY_1),
    ).toBe(DAY_2);
  });
});

describe("firstAvailableDate — režim ručnih termina", () => {
  it("nalazi dan sa slobodnim ručnim terminom", () => {
    expect(
      firstAvailableDate(
        args({
          isManual: true,
          manualSlots: { [DAY_2]: [{ time: "10:00", duration: 60 }] },
        }),
        DAY_1,
      ),
    ).toBe(DAY_2);
  });

  it("ignoriše radno vreme kad je režim ručni, a termini nisu definisani", () => {
    expect(
      firstAvailableDate(args({ isManual: true, manualSlots: {} }), DAY_1),
    ).toBeNull();
  });

  it("zauzet ručni termin ne čini dan slobodnim", () => {
    expect(
      firstAvailableDate(
        args({
          isManual: true,
          manualSlots: { [DAY_1]: [{ time: "10:00", duration: 60 }] },
          appointments: [{ date: DAY_1, time: "10:00", duration: 60 }],
        }),
        DAY_1,
        3,
      ),
    ).toBeNull();
  });
});

describe("widgetDay — stanje dana", () => {
  it("radan dan: puna mreža na 30 minuta", () => {
    const day = widgetDay(DAY_1, args());
    expect(day.isWorking).toBe(true);
    expect(day.slots).toHaveLength(16); // 09:00 … 16:30
    expect(day.fullyBooked).toBe(false);
    expect(day.bookedCount).toBe(0);
  });

  it("popunjen dan i dalje RADI — `fullyBooked`, ne `closed`", () => {
    const day = widgetDay(DAY_1, args({ appointments: [fullDay(DAY_1)] }));
    expect(day.isWorking).toBe(true);
    expect(day.fullyBooked).toBe(true);
    expect(day.bookedCount).toBe(16);
  });

  it("odmor gasi dan — to je `closed`, ne popunjeno", () => {
    const day = widgetDay(
      DAY_1,
      args({ vacations: [{ from: DAY_1, to: DAY_1 }] }),
    );
    expect(day.isWorking).toBe(false);
    expect(day.slots).toEqual([]);
  });

  it("pauza se ne pojavljuje u mreži", () => {
    const withBreak = {
      ...ALL_DAY_HOURS,
      Ponedeljak: [
        { from: "09:00", to: "12:00" },
        { from: "13:00", to: "17:00" },
      ],
    } as unknown as WorkingHoursMap;

    const times = widgetDay(DAY_1, args({ workingHours: withBreak })).slots.map(
      (slot) => slot.time,
    );
    expect(times).not.toContain("12:00");
    expect(times).not.toContain("12:30");
    expect(times).toContain("11:30");
    expect(times).toContain("13:00");
  });
});
