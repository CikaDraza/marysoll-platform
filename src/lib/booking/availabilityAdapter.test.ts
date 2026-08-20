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
import {
  availableTimesForDate as oldModalTimes,
} from "@/helpers/parseWorkingHours";
import {
  generateSlots as oldGenerateSlots,
  getWorkingRange as oldGetWorkingRange,
  isSlotBooked as oldIsSlotBooked,
} from "@/helpers/widgetAvailability";
import type { WorkingHoursMap } from "@/types";
import {
  availableTimesForDate,
  buildAvailabilityQuery,
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
