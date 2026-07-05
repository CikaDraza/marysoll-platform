/**
 * helpers/parseWorkingHours.ts
 *
 * Utilities for parsing and formatting working hours.
 *
 * DB stores working hours in two possible formats:
 *   Legacy: { "Ponedeljak": "08:00 - 17:00" }
 *   New:    { "Ponedeljak": [{ from: "08:00", to: "17:00" }, { from: "19:00", to: "22:00" }] }
 *
 * FullCalendar businessHours expects:
 *   { daysOfWeek: [1], startTime: "08:00", endTime: "17:00" }
 *   (one entry per slot — multi-slot days generate multiple entries)
 */

import { TimeSlot } from "@/types";
import { overlapsAppointments } from "@/helpers/manualSlots";

export type WorkingHoursInput = Record<string, string | TimeSlot[] | unknown>;

/**
 * Dostupna vremena za datum u klasičnom (radno vreme) režimu:
 * korak kroz radne opsege tako da termin [t, t+duration) ceo stane,
 * bez prošlih vremena (za današnji datum) i bez preklapanja sa zauzetim.
 * Koriste ga dropdown-i u BookingModal-u i panel modalima — UX odluka
 * 2026-07-05: klijent bira IZ PONUDE umesto slobodnog unosa 00–24.
 */
export function availableTimesForDate(args: {
  workingHours: WorkingHoursInput | null | undefined;
  dateStr: string;
  durationMin: number;
  booked: { date: string; time: string; duration?: number }[];
  stepMin?: number;
  now?: Date;
}): string[] {
  const { workingHours, dateStr, durationMin, booked, stepMin = 30 } = args;
  const now = args.now ?? new Date();
  if (!dateStr) return [];
  const duration = Math.max(durationMin, 1);
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const fromMin = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

  const times: string[] = [];
  for (const range of workingSlotsForDate(workingHours, dateStr)) {
    const start = toMin(range.from);
    const end = toMin(range.to);
    for (let t = start; t + duration <= end; t += stepMin) {
      const time = fromMin(t);
      if (new Date(`${dateStr}T${time}`) < now) continue;
      if (overlapsAppointments(booked, dateStr, time, duration)) continue;
      times.push(time);
    }
  }
  return times;
}

/** JS getDay() indeks → srpski naziv dana (ključ u workingHours mapi). */
const DAY_NAME_BY_JS_DAY = [
  "Nedelja",
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
];

/** Radni slotovi za konkretan datum (prazan niz = neradan dan). */
export function workingSlotsForDate(
  workingHours: WorkingHoursInput | null | undefined,
  dateStr: string,
): TimeSlot[] {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return [];
  const dayName = DAY_NAME_BY_JS_DAY[d.getDay()];
  return parseDaySlots(workingHours?.[dayName]);
}

/**
 * Da li termin [time, time+duration) ceo staje u radno vreme tog dana.
 * Koristi se za KLIJENTSKE tokove — admin namerno sme van radnog vremena.
 */
export function isWithinWorkingHours(
  workingHours: WorkingHoursInput | null | undefined,
  dateStr: string,
  time: string,
  durationMin: number,
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const start = toMin(time);
  const end = start + Math.max(durationMin, 0);
  return workingSlotsForDate(workingHours, dateStr).some(
    (slot) => start >= toMin(slot.from) && end <= toMin(slot.to),
  );
}

const DAY_MAP: Record<string, number> = {
  Ponedeljak: 1,
  Utorak: 2,
  Sreda: 3,
  Četvrtak: 4,
  Petak: 5,
  Subota: 6,
  Nedelja: 0,
};

/**
 * Parse a single working hours entry (string or slot array) into TimeSlot[].
 * Returns empty array for rest/closed days.
 */
export function parseDaySlots(value: unknown): TimeSlot[] {
  if (!value) return [];

  // New format: array of { from, to }
  if (Array.isArray(value)) {
    return value
      .map((slot) => {
        if (typeof slot === "object" && slot !== null) {
          const s = slot as Record<string, unknown>;
          const from = String(s.from ?? "").trim();
          const to = String(s.to ?? "").trim();
          if (from && to) return { from, to };
        }
        return null;
      })
      .filter((s): s is TimeSlot => s !== null);
  }

  // Legacy string format: "08:00 - 17:00" or "08:00-17:00"
  if (typeof value === "string" && value.trim()) {
    const match = value.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (match) return [{ from: match[1], to: match[2] }];
  }

  return [];
}

/**
 * Convert WorkingHoursInput to FullCalendar businessHours format.
 * Multi-slot days produce multiple businessHours entries.
 */
export function toFullCalendarBusinessHours(
  workingHours: WorkingHoursInput | null | undefined,
): { daysOfWeek: number[]; startTime: string; endTime: string }[] {
  if (!workingHours || typeof workingHours !== "object") return [];

  const result: { daysOfWeek: number[]; startTime: string; endTime: string }[] =
    [];

  for (const [day, value] of Object.entries(workingHours)) {
    const dayNum = DAY_MAP[day];
    if (dayNum === undefined) continue;

    const slots = parseDaySlots(value);
    for (const slot of slots) {
      result.push({
        daysOfWeek: [dayNum],
        startTime: slot.from,
        endTime: slot.to,
      });
    }
  }

  return result;
}


/**
 * Get all days with their formatted hours for display.
 */
export function formatWorkingHoursForDisplay(
  workingHours: WorkingHoursInput | null | undefined,
): { day: string; hours: string; isOpen: boolean }[] {
  const days = Object.keys(DAY_MAP);
  if (!workingHours) {
    return days.map((day) => ({ day, hours: "Neradan", isOpen: false }));
  }

  return days.map((day) => {
    const value = (workingHours as Record<string, unknown>)[day];
    const slots = parseDaySlots(value);
    return {
      day,
      hours:
        slots.length > 0
          ? slots.map((s) => `${s.from} – ${s.to}`).join(", ")
          : "Neradan",
      isOpen: slots.length > 0,
    };
  });
}

