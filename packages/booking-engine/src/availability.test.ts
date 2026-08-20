/**
 * Availability core — ovo postaje osnova SVIH budućih rezervacija, pa su
 * pravila zaključana pojedinačno, a ne kroz jedan „happy path".
 *
 * Šta ovde NIJE: prevod srpskih naziva dana, filtriranje otkazanih termina i
 * čitanje `SalonProfile`-a. To su domenski pojmovi i žive u adapteru
 * (`src/lib/booking/availabilityAdapter.ts`) — engine sme da zna samo za
 * raspored, pauze, odmore, zauzetost i trajanje.
 */
import { describe, expect, it } from "vitest";
import {
  computeAvailability,
  findFirstAvailableDay,
} from "./availability";
import type { AvailabilityQuery } from "./types";

const TZ = "Europe/Belgrade";
const MONDAY = "2026-08-24"; // ponedeljak
const SUNDAY = "2026-08-23"; // nedelja

/** 09:00–17:00 ponedeljkom, 60 min termin, korak 30. */
function query(over: Partial<AvailabilityQuery> = {}): AvailabilityQuery {
  return {
    tenantId: "t1",
    resourceKey: "kabina-1",
    localDate: MONDAY,
    timezone: TZ,
    durationMinutes: 60,
    stepMinutes: 30,
    schedule: { 1: [{ from: "09:00", to: "17:00" }] },
    ...over,
  };
}

function localStarts(q: AvailabilityQuery): string[] {
  return computeAvailability(q).slots.map((s) => s.localStart);
}

/** Zauzetost iz lokalnog vremena — u testu, jer engine prima instante. */
function occupancy(date: string, time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const startsAt = new Date(
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)),
      h - 2, // avgust u Beogradu = CEST (+2)
      m,
    ),
  );
  return { startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60_000) };
}

describe("radni dan i zatvoren dan", () => {
  it("radni dan daje termine koji CEO staju u opseg", () => {
    // 09:00–17:00, 60 min, korak 30 → poslednji početak je 16:00, ne 16:30.
    expect(localStarts(query())).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00",
    ]);
  });

  it("dan koji nije u rasporedu je zatvoren → []", () => {
    expect(computeAvailability(query({ localDate: SUNDAY })).slots).toEqual([]);
  });

  it("prazan raspored za taj dan je isto zatvoren dan", () => {
    expect(computeAvailability(query({ schedule: { 1: [] } })).slots).toEqual([]);
  });
});

describe("pauza", () => {
  it("pauza 12–13 se ne pojavljuje i nijedan termin je ne preseca", () => {
    const starts = localStarts(
      query({ breaks: { 1: [{ from: "12:00", to: "13:00" }] } }),
    );
    // 11:30 bi trajao do 12:30 → mora otpasti; 11:00 (do 12:00) ostaje.
    expect(starts).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00",
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00",
    ]);
  });

  it("dva opsega sa rupom rade isto kao raspored + pauza", () => {
    const withBreak = localStarts(
      query({ breaks: { 1: [{ from: "12:00", to: "13:00" }] } }),
    );
    const twoRanges = localStarts(
      query({
        schedule: {
          1: [
            { from: "09:00", to: "12:00" },
            { from: "13:00", to: "17:00" },
          ],
        },
      }),
    );
    expect(twoRanges).toEqual(withBreak);
  });
});

describe("odmor", () => {
  it("odmor preko celog dana → []", () => {
    expect(
      computeAvailability(
        query({ vacations: [{ from: "2026-08-20", to: "2026-08-30" }] }),
      ).slots,
    ).toEqual([]);
  });

  it("odmor od podne seče samo taj deo dana", () => {
    const starts = localStarts(
      query({
        vacations: [{ from: MONDAY, to: MONDAY, fromTime: "12:00" }],
      }),
    );
    expect(starts).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("odmor koji se završava u podne oslobađa popodne", () => {
    const starts = localStarts(
      query({ vacations: [{ from: "2026-08-01", to: MONDAY, toTime: "12:00" }] }),
    );
    expect(starts[0]).toBe("12:00");
    expect(starts.at(-1)).toBe("16:00");
  });

  it("dan van opsega odmora nije dirnut", () => {
    const starts = localStarts(
      query({ vacations: [{ from: "2026-09-01", to: "2026-09-10" }] }),
    );
    expect(starts).toHaveLength(15);
  });
});

describe("trajanje", () => {
  it("60-minutni termin ne staje u 30-minutnu rupu", () => {
    const gap = query({
      schedule: {
        1: [
          { from: "09:00", to: "10:00" },
          { from: "10:30", to: "11:00" }, // rupa od 30 min
        ],
      },
    });
    expect(localStarts(gap)).toEqual(["09:00"]);
  });

  it("30-minutni termin u istu rupu staje", () => {
    const gap = query({
      durationMinutes: 30,
      schedule: {
        1: [
          { from: "09:00", to: "10:00" },
          { from: "10:30", to: "11:00" },
        ],
      },
    });
    expect(localStarts(gap)).toEqual(["09:00", "09:30", "10:30"]);
  });
});

describe("zauzetost — half-open [start, end)", () => {
  it("termin koji počinje tačno kad se prethodni završava je DOZVOLJEN", () => {
    const starts = localStarts(
      query({ occupancies: [occupancy(MONDAY, "10:00", 60)] }),
    );
    expect(starts).toContain("11:00"); // prethodni ide do 11:00
    expect(starts).not.toContain("10:00");
  });

  it("preklapanje blokira i kad je delimično", () => {
    // Zauzeto 12:00–13:00; kandidat 11:30–12:30 se preklapa i mora otpasti.
    // Baš ovo je zatečeni widget propuštao — gledao je samo početak kandidata.
    const starts = localStarts(
      query({ occupancies: [occupancy(MONDAY, "12:00", 60)] }),
    );
    expect(starts).not.toContain("11:30");
    expect(starts).not.toContain("12:00");
    expect(starts).toContain("11:00");
    expect(starts).toContain("13:00");
  });

  it("zauzetost drugog dana ne dira ovaj dan", () => {
    const starts = localStarts(
      query({ occupancies: [occupancy("2026-08-25", "10:00", 60)] }),
    );
    expect(starts).toHaveLength(15);
  });
});

describe("ručni termini", () => {
  it("ponuda je tačno ono što je salon definisao, sa svojim trajanjem", () => {
    const result = computeAvailability(
      query({
        manualSlots: [
          { time: "10:00", durationMinutes: 90 },
          { time: "15:00", durationMinutes: 45 },
        ],
      }),
    );
    expect(result.slots.map((s) => [s.localStart, s.localEnd])).toEqual([
      ["10:00", "11:30"],
      ["15:00", "15:45"],
    ]);
  });

  it("raspored i pauze se u ovom režimu ne koriste", () => {
    // 20:00 je van 09–17, a ipak se nudi — salon ga je izričito definisao.
    const result = computeAvailability(
      query({ manualSlots: [{ time: "20:00", durationMinutes: 60 }] }),
    );
    expect(result.slots.map((s) => s.localStart)).toEqual(["20:00"]);
  });

  it("važi ISTI overlap contract kao za raspored", () => {
    const result = computeAvailability(
      query({
        manualSlots: [
          { time: "10:00", durationMinutes: 60 },
          { time: "11:00", durationMinutes: 60 },
        ],
        occupancies: [occupancy(MONDAY, "10:30", 30)],
      }),
    );
    // 10:00–11:00 se preklapa sa 10:30–11:00 → pada.
    // 11:00–12:00 počinje tačno na kraju zauzetog → prolazi.
    expect(result.slots.map((s) => s.localStart)).toEqual(["11:00"]);
  });

  it("odmor gasi i ručne termine", () => {
    const result = computeAvailability(
      query({
        manualSlots: [{ time: "10:00", durationMinutes: 60 }],
        vacations: [{ from: MONDAY, to: MONDAY }],
      }),
    );
    expect(result.slots).toEqual([]);
  });
});

describe("vremenska zona je eksplicitna", () => {
  it("isti lokalni sat u dve zone daje različite instante", () => {
    const belgrade = computeAvailability(query()).slots[0];
    const london = computeAvailability(
      query({ timezone: "Europe/London" }),
    ).slots[0];

    expect(belgrade.localStart).toBe("09:00");
    expect(london.localStart).toBe("09:00");
    // Avgust: Beograd CEST (+2), London BST (+1) → sat razlike u instantu.
    expect(london.startsAt.getTime() - belgrade.startsAt.getTime()).toBe(3_600_000);
  });

  it("`now` se poredi po instantu, ne po naivnom stringu", () => {
    // 08:30 UTC = 10:30 u Beogradu → 09:00 i 09:30 su prošli, 10:30 ostaje.
    const starts = localStarts(
      query({ now: new Date("2026-08-24T08:30:00Z") }),
    );
    expect(starts[0]).toBe("10:30");
  });

  it("bez `now` se prošlost ne filtrira — odluka pozivaoca", () => {
    expect(localStarts(query())).toHaveLength(15);
  });
});

describe("DST", () => {
  const ALL_DAY = { 0: [{ from: "00:00", to: "00:00" }] };

  it("prolećni dan ima 23 sata — sat koji ne postoji se ne nudi", () => {
    const result = computeAvailability(
      query({
        localDate: "2026-03-29", // nedelja, Beograd preskače 02:00 → 03:00
        schedule: ALL_DAY,
        durationMinutes: 60,
        stepMinutes: 60,
      }),
    );

    const starts = result.slots.map((s) => s.localStart);
    expect(starts).not.toContain("02:00");
    expect(result.slots).toHaveLength(23); // naivnih 24h bi dalo 24

    const first = result.slots[0].startsAt.getTime();
    const last = result.slots.at(-1)!.endsAt.getTime();
    expect(last - first).toBe(23 * 3_600_000);
  });

  it("posle pomeranja instant prati novi pomak (+2), ne stari (+1)", () => {
    const result = computeAvailability(
      query({
        localDate: "2026-03-29",
        schedule: ALL_DAY,
        durationMinutes: 60,
        stepMinutes: 60,
      }),
    );
    const at3 = result.slots.find((s) => s.localStart === "03:00")!;
    expect(at3.startsAt.toISOString()).toBe("2026-03-29T01:00:00.000Z");

    const at1 = result.slots.find((s) => s.localStart === "01:00")!;
    expect(at1.startsAt.toISOString()).toBe("2026-03-29T00:00:00.000Z");
  });

  it("jesenji dan ima 25 sati, ali se ponovljeni sat nudi jednom", () => {
    // Svesna granica: raspored je u LOKALNOM vremenu, pa 02:30 kao pojam
    // postoji jednom. Dupla rezervacija u ponovljenom satu je stvar Slice 5
    // (occupancy je instant, pa se drugi prolaz vidi kao zauzet).
    const result = computeAvailability(
      query({
        localDate: "2026-10-25",
        schedule: ALL_DAY,
        durationMinutes: 60,
        stepMinutes: 60,
      }),
    );
    expect(result.slots).toHaveLength(24);
    expect(result.slots.map((s) => s.localStart).filter((t) => t === "02:00")).toHaveLength(1);
  });
});

describe("klasifikacija (ulaz za Pricing/Loyalty, Slice 5)", () => {
  const bands = [
    { from: "09:00", to: "18:00", class: "standard" as const },
    { from: "18:00", to: "21:00", class: "extended" as const },
    { from: "21:00", to: "00:00", class: "exceptional" as const },
  ];

  it("bez opsega je sve standard", () => {
    const slots = computeAvailability(query()).slots;
    expect(new Set(slots.map((s) => s.availabilityClass))).toEqual(
      new Set(["standard"]),
    );
  });

  it("opsezi klasifikuju termin po njegovom POČETKU", () => {
    const result = computeAvailability(
      query({
        schedule: { 1: [{ from: "17:00", to: "23:00" }] },
        bands,
        stepMinutes: 60,
      }),
    );
    const byStart = Object.fromEntries(
      result.slots.map((s) => [s.localStart, s.availabilityClass]),
    );
    expect(byStart["17:00"]).toBe("standard");
    expect(byStart["18:00"]).toBe("extended");
    expect(byStart["21:00"]).toBe("exceptional");
  });

  it("outsidePreferredHours je činjenica, ne cena", () => {
    const result = computeAvailability(
      query({
        schedule: { 1: [{ from: "17:00", to: "23:00" }] },
        preferredHours: [{ from: "09:00", to: "18:00" }],
        stepMinutes: 60,
      }),
    );
    expect(result.slots[0].outsidePreferredHours).toBe(false); // 17:00–18:00
    expect(result.slots[1].outsidePreferredHours).toBe(true); // 18:00–19:00
  });
});

describe("determinizam", () => {
  it("isti upit daje isti rezultat", () => {
    const q = query({ occupancies: [occupancy(MONDAY, "12:00", 60)] });
    expect(JSON.stringify(computeAvailability(q))).toBe(
      JSON.stringify(computeAvailability(q)),
    );
  });

  it("redosled ulaznih opsega ne menja izlaz", () => {
    const ascending = localStarts(
      query({
        schedule: {
          1: [
            { from: "09:00", to: "12:00" },
            { from: "13:00", to: "17:00" },
          ],
        },
      }),
    );
    const descending = localStarts(
      query({
        schedule: {
          1: [
            { from: "13:00", to: "17:00" },
            { from: "09:00", to: "12:00" },
          ],
        },
      }),
    );
    expect(descending).toEqual(ascending);
  });

  it("slotovi su sortirani rastuće po instantu", () => {
    const slots = computeAvailability(query()).slots;
    const times = slots.map((s) => s.startsAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe("findFirstAvailableDay", () => {
  it("preskače neradne dane i vraća prvi radni", () => {
    expect(
      findFirstAvailableDay(query(), { fromDate: "2026-08-22" }),
    ).toBe(MONDAY);
  });

  it("preskače dan koji je ceo zauzet", () => {
    const busy = Array.from({ length: 8 }, (_, i) =>
      occupancy(MONDAY, `${String(9 + i).padStart(2, "0")}:00`, 60),
    );
    expect(
      findFirstAvailableDay(query({ occupancies: busy }), { fromDate: MONDAY }),
    ).toBe("2026-08-31");
  });

  it("van horizonta vraća null", () => {
    expect(
      findFirstAvailableDay(query({ schedule: {} }), {
        fromDate: MONDAY,
        horizonDays: 10,
      }),
    ).toBeNull();
  });
});
