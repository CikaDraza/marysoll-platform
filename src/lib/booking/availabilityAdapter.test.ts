/**
 * Adapter domen → availability core, plus REGRESIJA protiv zatečenih kopija.
 *
 * Regresija je namerno u dva dela:
 *   1. „paritet" — tamo gde stari sistem NIJE imao bug, nova vrednost mora
 *      biti identična;
 *   2. „namerna razlika" — za tri poznata buga test izričito tvrdi da je nova
 *      vrednost DRUGAČIJA, i zašto.
 *
 * Bez drugog dela bi „paritet" značio obavezu da se reprodukuje postojeći bug.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { WorkingHoursMap } from "@/types";
import {
  availableTimesForDate,
  buildAvailabilityQuery,
  dayAvailabilityState,
  daySlotStates,
  findFirstAvailableDate,
  parseDayRanges,
  toOccupancies,
  toSchedule,
  type BuildQueryInput,
} from "./availabilityAdapter";

const MONDAY = "2026-08-24"; // ponedeljak
const SUNDAY = "2026-08-23";
/** Stari kod filtrira prošlost preko `new Date()`; fiksiramo da bude determinističan. */
const LONG_AGO = new Date("2020-01-01T00:00:00Z");

const WORKING_HOURS = {
  Ponedeljak: [{ from: "09:00", to: "17:00" }],
  Utorak: [{ from: "09:00", to: "17:00" }],
  Sreda: [],
  Četvrtak: [{ from: "09:00", to: "17:00" }],
  Petak: [{ from: "09:00", to: "17:00" }],
  Subota: [],
  Nedelja: [],
} as unknown as WorkingHoursMap;

/** Radno vreme sa pauzom 12–13 — dva opsega, kako ih panel i upisuje. */
const WITH_BREAK = {
  ...WORKING_HOURS,
  Ponedeljak: [
    { from: "09:00", to: "12:00" },
    { from: "13:00", to: "17:00" },
  ],
} as unknown as WorkingHoursMap;

function input(over: Partial<BuildQueryInput> = {}): BuildQueryInput {
  return {
    tenantId: "t1",
    localDate: MONDAY,
    durationMinutes: 60,
    profile: { workingHours: WORKING_HOURS },
    appointments: [],
    stepMinutes: 30,
    ...over,
  };
}

describe("srpski nazivi dana", () => {
  it("ključ Ponedeljak daje radni ponedeljak", () => {
    expect(availableTimesForDate(input())[0]).toBe("09:00");
  });

  it("dan bez opsega (Nedelja) je neradan", () => {
    expect(availableTimesForDate(input({ localDate: SUNDAY }))).toEqual([]);
  });

  it("mapa se prevodi u indekse dana koje engine razume", () => {
    expect(Object.keys(toSchedule(WORKING_HOURS)).sort()).toEqual(["1", "2", "4", "5"]);
  });

  it("ENGLESKI ključ ne postoji u profilu — dan ispada neradan", () => {
    // Ovo je tačan oblik zatečenog buga u `/api/slots`: ruta je dan tražila kao
    // "monday", a profil ga drži kao "Ponedeljak" → ruta je uvek vraćala [].
    const english = { monday: [{ from: "09:00", to: "17:00" }] };
    expect(availableTimesForDate(input({ profile: { workingHours: english } }))).toEqual([]);
  });
});

describe("legacy zapis radnog vremena", () => {
  it("legacy string 08:00 - 17:00 se čita isto kao niz opsega", () => {
    expect(parseDayRanges("08:00 - 17:00")).toEqual([{ from: "08:00", to: "17:00" }]);
    expect(parseDayRanges("08:00-17:00")).toEqual([{ from: "08:00", to: "17:00" }]);
    expect(parseDayRanges("08:00 – 17:00")).toEqual([{ from: "08:00", to: "17:00" }]);
  });

  it("nepoznat oblik je neradan dan, ne greška", () => {
    expect(parseDayRanges("zatvoreno")).toEqual([]);
    expect(parseDayRanges(null)).toEqual([]);
    expect(parseDayRanges({ from: "09:00" })).toEqual([]);
  });
});

describe("statusi termina — domenski pojam, ostaje u adapteru", () => {
  const at = (time: string, status?: string) => ({
    date: MONDAY,
    time,
    duration: 60,
    ...(status ? { status } : {}),
  });

  it("otkazan i odbijen NE blokiraju", () => {
    const times = availableTimesForDate(
      input({
        appointments: [
          at("10:00", "appointment_cancelled"),
          at("11:00", "appointment_rejected"),
        ],
      }),
    );
    expect(times).toContain("10:00");
    expect(times).toContain("11:00");
  });

  it("odobren i neodobren (`pending`) blokiraju", () => {
    const times = availableTimesForDate(
      input({
        appointments: [
          at("10:00", "appointment_approved"),
          at("14:00", "pending"),
        ],
      }),
    );
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("14:00");
  });

  it("termin bez trajanja se računa kao 60 minuta", () => {
    const [occ] = toOccupancies([{ date: MONDAY, time: "10:00" }])!;
    expect(occ.endsAt.getTime() - occ.startsAt.getTime()).toBe(3_600_000);
  });
});

describe("odmori i ručni termini iz profila", () => {
  it("odmor preko celog dana gasi dan", () => {
    expect(
      availableTimesForDate(
        input({
          profile: {
            workingHours: WORKING_HOURS,
            vacations: [{ from: "2026-08-24", to: "2026-08-26" }],
          },
        }),
      ),
    ).toEqual([]);
  });

  it("ručni termini se koriste SAMO u tom režimu", () => {
    const profile = {
      workingHours: WORKING_HOURS,
      availabilityMode: "manualSlots" as const,
      manualSlots: { [MONDAY]: [{ time: "18:30", duration: 45 }] },
    };
    expect(availableTimesForDate(input({ profile }))).toEqual(["18:30"]);

    // Isti profil bez režima → raspored, ručni termin se ignoriše.
    expect(
      availableTimesForDate(
        input({ profile: { ...profile, availabilityMode: "workingHours" } }),
      ),
    ).not.toContain("18:30");
  });

  it("ručni termini drugog datuma ne ulaze u ovaj dan", () => {
    const query = buildAvailabilityQuery(
      input({
        profile: {
          availabilityMode: "manualSlots",
          manualSlots: { "2026-08-25": [{ time: "10:00", duration: 60 }] },
        },
      }),
    );
    expect(query.manualSlots).toEqual([]);
  });
});


// ─── Zamrznut snimak implementacije PRE Slice 3 ──────────────────────────────
//
// Stari kod je obrisan iz produkcije (`helpers/widgetAvailability.ts` i
// `availableTimesForDate`), ali regresija mora da ostane proverljiva. Zato
// kopije žive OVDE. Ne dirati ih: ovo je istorijski zapis, ne implementacija.

const OLD_DAY_NAMES = [
  "Nedelja",
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
];

function oldToMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function oldFromMin(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function oldParseDaySlots(value: unknown): { from: string; to: string }[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((slot) => {
        const s = slot as Record<string, unknown>;
        const from = String(s?.from ?? "").trim();
        const to = String(s?.to ?? "").trim();
        return from && to ? { from, to } : null;
      })
      .filter((s): s is { from: string; to: string } => s !== null);
  }
  if (typeof value === "string" && value.trim()) {
    const match = value.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (match) return [{ from: match[1], to: match[2] }];
  }
  return [];
}

function oldDayRanges(workingHours: unknown, dateStr: string) {
  const day = new Date(`${dateStr}T00:00:00`);
  const name = OLD_DAY_NAMES[day.getDay()];
  return oldParseDaySlots((workingHours as Record<string, unknown>)?.[name]);
}

function oldOverlaps(
  booked: { date: string; time: string; duration?: number }[],
  dateStr: string,
  time: string,
  duration: number,
): boolean {
  const start = oldToMin(time);
  const end = start + duration;
  return booked.some((a) => {
    if (a.date !== dateStr) return false;
    const s = oldToMin(a.time);
    const e = s + (a.duration || 60);
    return start < e && end > s;
  });
}

/** `helpers/parseWorkingHours.availableTimesForDate` — modalni tok. */
function oldModalTimes(args: {
  workingHours: unknown;
  dateStr: string;
  durationMin: number;
  booked: { date: string; time: string; duration?: number }[];
  stepMin?: number;
  now?: Date;
}): string[] {
  const { workingHours, dateStr, durationMin, booked, stepMin = 30 } = args;
  const now = args.now ?? new Date();
  const duration = Math.max(durationMin, 1);
  const times: string[] = [];
  for (const range of oldDayRanges(workingHours, dateStr)) {
    const start = oldToMin(range.from);
    const end = oldToMin(range.to);
    for (let t = start; t + duration <= end; t += stepMin) {
      const time = oldFromMin(t);
      if (new Date(`${dateStr}T${time}`) < now) continue;
      if (oldOverlaps(booked, dateStr, time, duration)) continue;
      times.push(time);
    }
  }
  return times;
}

/** `helpers/widgetAvailability.getWorkingRange` — min(from)/max(to), briše pauzu. */
function oldGetWorkingRange(
  workingHours: unknown,
  date: Date,
): { isWorking: boolean; start: string; end: string } {
  const name = OLD_DAY_NAMES[date.getDay()];
  const slots = ((workingHours as Record<string, unknown>)?.[name] ?? []) as {
    from: string;
    to: string;
  }[];
  if (!slots.length) return { isWorking: false, start: "", end: "" };
  const starts = slots.map((s) => s.from).sort();
  const ends = slots.map((s) => s.to).sort();
  return { isWorking: true, start: starts[0], end: ends[ends.length - 1] };
}

/** `helpers/widgetAvailability.generateSlots` — korak 30, bez provere trajanja. */
function oldGenerateSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  for (let cur = oldToMin(start); cur < oldToMin(end); cur += 30) {
    slots.push(oldFromMin(cur));
  }
  return slots;
}

/** `helpers/widgetAvailability.isSlotBooked` — gleda SAMO početak kandidata. */
function oldIsSlotBooked(
  appointments: { date: string; time: string; duration?: number }[],
  dateStr: string,
  slot: string,
): boolean {
  const slotMin = oldToMin(slot);
  return appointments.some((a) => {
    if (a.date !== dateStr) return false;
    const start = oldToMin(a.time);
    return slotMin >= start && slotMin < start + (a.duration || 60);
  });
}

// ─── 1. PARITET: gde stari sistem nije grešio ────────────────────────────────

describe("paritet sa zatečenim modalnim tokom (bez buga)", () => {
  const cases: { name: string; duration: number; booked: { date: string; time: string; duration?: number }[] }[] = [
    { name: "prazan dan, 60 min", duration: 60, booked: [] },
    { name: "prazan dan, 30 min", duration: 30, booked: [] },
    { name: "prazan dan, 90 min", duration: 90, booked: [] },
    {
      name: "jedan zauzet termin u sredini",
      duration: 60,
      booked: [{ date: MONDAY, time: "12:00", duration: 60 }],
    },
    {
      name: "dva zauzeta termina",
      duration: 30,
      booked: [
        { date: MONDAY, time: "09:00", duration: 60 },
        { date: MONDAY, time: "15:30", duration: 30 },
      ],
    },
  ];

  for (const testCase of cases) {
    it(`${testCase.name} → identičan spisak`, () => {
      const before = oldModalTimes({
        workingHours: WORKING_HOURS,
        dateStr: MONDAY,
        durationMin: testCase.duration,
        booked: testCase.booked,
        stepMin: 30,
        now: LONG_AGO,
      });

      const after = availableTimesForDate(
        input({
          durationMinutes: testCase.duration,
          appointments: testCase.booked,
        }),
      );

      expect(after).toEqual(before);
    });
  }

  it("i sa pauzom — modalni tok je poštovao oba opsega", () => {
    const before = oldModalTimes({
      workingHours: WITH_BREAK,
      dateStr: MONDAY,
      durationMin: 60,
      booked: [],
      stepMin: 30,
      now: LONG_AGO,
    });
    const after = availableTimesForDate(
      input({ profile: { workingHours: WITH_BREAK } }),
    );
    expect(after).toEqual(before);
  });
});

// ─── 2. NAMERNA RAZLIKA: tri poznata buga ────────────────────────────────────

describe("namerno DRUGAČIJE od zatečenog widgeta", () => {
  /** Stari widget put: min(from)…max(to) + korak + provera samo POČETKA. */
  function oldWidgetTimes(
    workingHours: WorkingHoursMap,
    dateStr: string,
    booked: { date: string; time: string; duration?: number }[],
  ): string[] {
    const range = oldGetWorkingRange(workingHours, new Date(`${dateStr}T00:00:00`));
    if (!range.isWorking) return [];
    return oldGenerateSlots(range.start, range.end).filter(
      (time) => !oldIsSlotBooked(booked, dateStr, time),
    );
  }

  it("PAUZA: widget je nudio termine usred pauze, core ih ne nudi", () => {
    const before = oldWidgetTimes(WITH_BREAK, MONDAY, []);
    const after = availableTimesForDate(
      input({ profile: { workingHours: WITH_BREAK }, durationMinutes: 30 }),
    );

    // Stari `getWorkingRange` uzima min(from)=09:00 i max(to)=17:00 → pauza nestaje.
    expect(before).toContain("12:00");
    expect(before).toContain("12:30");
    // Novi seče pauzu kao interval.
    expect(after).not.toContain("12:00");
    expect(after).not.toContain("12:30");
    expect(after).not.toEqual(before);
  });

  it("PREKLAPANJE: widget je gledao samo početak kandidata, core gleda ceo termin", () => {
    const booked = [{ date: MONDAY, time: "12:00", duration: 60 }];
    const before = oldWidgetTimes(WORKING_HOURS, MONDAY, booked);
    const after = availableTimesForDate(input({ appointments: booked }));

    // 11:30 + 60 min ulazi u zauzeto 12:00–13:00; stari ga je ipak nudio.
    expect(before).toContain("11:30");
    expect(after).not.toContain("11:30");
  });

  it("ODMOR: nijedna zatečena putanja ga nije gledala, core ga poštuje", () => {
    const vacation = { from: MONDAY, to: MONDAY };
    // Stari modalni tok ne prima odmore uopšte — vraća pun dan.
    const before = oldModalTimes({
      workingHours: WORKING_HOURS,
      dateStr: MONDAY,
      durationMin: 60,
      booked: [],
      stepMin: 30,
      now: LONG_AGO,
    });
    const after = availableTimesForDate(
      input({ profile: { workingHours: WORKING_HOURS, vacations: [vacation] } }),
    );

    expect(before.length).toBeGreaterThan(0);
    expect(after).toEqual([]);
  });
});

describe("prvi slobodan dan", () => {
  it("preskače neradne dane iz profila", () => {
    // Subota i nedelja nisu u rasporedu → prvi slobodan je ponedeljak.
    expect(
      findFirstAvailableDate(input(), { fromDate: "2026-08-22" }),
    ).toBe(MONDAY);
  });

  it("preskače dan pokriven odmorom", () => {
    expect(
      findFirstAvailableDate(
        input({
          profile: {
            workingHours: WORKING_HOURS,
            vacations: [{ from: "2026-08-24", to: "2026-08-27" }],
          },
        }),
        { fromDate: MONDAY },
      ),
    ).toBe("2026-08-28");
  });
});

// ─── GRANICA: šta engine NE sme da zna ───────────────────────────────────────

describe("granica paketa: availability core ne zna domen", () => {
  /**
   * Provera ide nad KODOM bez komentara — granica se u komentarima objašnjava
   * („Engine NE zna: Service, Appointment…"), pa bi sirov tekst kažnjavao
   * dokumentaciju umesto koda. Isti obrazac kao `theme-composition.test.ts`.
   */
  const ENGINE_FILES = [
    "packages/booking-engine/src/types.ts",
    "packages/booking-engine/src/time.ts",
    "packages/booking-engine/src/intervals.ts",
    "packages/booking-engine/src/availability.ts",
    "packages/booking-engine/src/index.ts",
  ];

  const FORBIDDEN: [RegExp, string][] = [
    [/\b(IService|IAppointment|SalonProfile|ConsultationOffering|EducationSession)\b/, "domenski model"],
    [/\bappointment_(approved|rejected|cancelled|rescheduled)\b/, "status termina"],
    [/(Ponedeljak|Utorak|Sreda|Četvrtak|Petak|Subota|Nedelja)/, "srpski naziv dana"],
    [/\btheme-\d\b|\bTheme9\b/, "znanje o temi"],
    [/Europe\/Belgrade/, "zakucana vremenska zona"],
    [/availabilityMode|manualSlots\s*\[/, "oblik SalonProfile-a"],
  ];

  function codeOf(file: string): string {
    return readFileSync(path.join(process.cwd(), file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*)/.test(line))
      .join("\n");
  }

  for (const file of ENGINE_FILES) {
    it(`${file} je čist`, () => {
      const src = codeOf(file);
      for (const [pattern, what] of FORBIDDEN) {
        expect(pattern.test(src), `${file} sadrži ${what}`).toBe(false);
      }
    });
  }

  it("paket ne uvozi ništa van sebe — ni aplikaciju, ni framework, ni DB", () => {
    for (const file of ENGINE_FILES) {
      const src = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(src, file).not.toMatch(/from\s+"@\//);
      expect(src, file).not.toMatch(/from\s+"(react|next|mongoose|zod|date-fns)"/);
      // Jedini dozvoljeni uvozi su relativni unutar paketa.
      for (const [, spec] of src.matchAll(/from\s+"([^"]+)"/g)) {
        expect(spec.startsWith("./"), `${file} uvozi ${spec}`).toBe(true);
      }
    }
  });

  it("engine nema I/O — ni baze, ni mreže, ni Date.now()", () => {
    for (const file of ENGINE_FILES) {
      const src = codeOf(file);
      expect(src, file).not.toMatch(/\bfetch\(|\bawait\b|Date\.now\(\)|process\.env/);
    }
  });
});

// ─── Prikaz u widgetu ────────────────────────────────────────────────────────

describe("daySlotStates — zauzeto i prošlo su različita stanja", () => {
  /** Widget crta mrežu na 30 min, bez obzira na trajanje usluge. */
  const grid = (over: Partial<BuildQueryInput> = {}) =>
    input({ durationMinutes: 30, stepMinutes: 30, ...over });

  it("puna ponuda dana ostaje vidljiva i kad je termin zauzet", () => {
    const states = daySlotStates(
      grid({ appointments: [{ date: MONDAY, time: "10:00", duration: 60 }] }),
    );
    // 09:00–17:00 na 30 min = 16 termina; nijedan ne nestaje.
    expect(states).toHaveLength(16);
    expect(states.find((s) => s.time === "10:00")?.taken).toBe(true);
    expect(states.find((s) => s.time === "10:30")?.taken).toBe(true);
    expect(states.find((s) => s.time === "11:00")?.taken).toBe(false);
  });

  it("prošlo se razlikuje od zauzetog", () => {
    const states = daySlotStates(
      grid({ now: new Date("2026-08-24T08:30:00Z") }), // 10:30 u Beogradu
    );
    expect(states.find((s) => s.time === "09:00")).toMatchObject({
      past: true,
      taken: false,
    });
    expect(states.find((s) => s.time === "11:00")).toMatchObject({
      past: false,
      taken: false,
    });
  });

  it("ručni termin nosi svoje trajanje", () => {
    const states = daySlotStates(
      grid({
        profile: {
          availabilityMode: "manualSlots",
          manualSlots: { [MONDAY]: [{ time: "10:00", duration: 90 }] },
        },
      }),
    );
    expect(states).toEqual([
      { time: "10:00", endTime: "11:30", durationMinutes: 90, taken: false, past: false },
    ]);
  });
});

describe("dayAvailabilityState — tri stanja u mesečnom prikazu", () => {
  const grid = (over: Partial<BuildQueryInput> = {}) =>
    input({ durationMinutes: 30, stepMinutes: 30, ...over });

  it("neradan dan i odmor su `closed`", () => {
    expect(dayAvailabilityState(grid({ localDate: SUNDAY }))).toBe("closed");
    expect(
      dayAvailabilityState(
        grid({
          profile: {
            workingHours: WORKING_HOURS,
            vacations: [{ from: MONDAY, to: MONDAY }],
          },
        }),
      ),
    ).toBe("closed");
  });

  it("sve zauzeto je `full`, ne `closed` — salon tog dana radi", () => {
    const allDay = Array.from({ length: 8 }, (_, i) => ({
      date: MONDAY,
      time: `${String(9 + i).padStart(2, "0")}:00`,
      duration: 60,
    }));
    expect(dayAvailabilityState(grid({ appointments: allDay }))).toBe("full");
  });

  it("dan u kome je sve prošlo je `full`, ne `free`", () => {
    expect(
      dayAvailabilityState(grid({ now: new Date("2026-08-24T20:00:00Z") })),
    ).toBe("full");
  });

  it("bar jedan slobodan i budući termin je `free`", () => {
    expect(dayAvailabilityState(grid())).toBe("free");
  });
});
