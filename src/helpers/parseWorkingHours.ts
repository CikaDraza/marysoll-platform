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

export type WorkingHoursRaw = Record<string, string | TimeSlot[] | unknown>;

export const DAY_MAP: Record<string, number> = {
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
 * Convert WorkingHoursRaw to FullCalendar businessHours format.
 * Multi-slot days produce multiple businessHours entries.
 */
export function toFullCalendarBusinessHours(
  workingHours: WorkingHoursRaw | null | undefined,
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
 * Format working hours for display in UI (e.g., "08:00 – 17:00, 19:00 – 22:00").
 * Returns "Neradan" if no slots for that day.
 */
export function formatDayWorkingHours(value: unknown): string {
  const slots = parseDaySlots(value);
  if (slots.length === 0) return "Neradan";
  return slots.map((s) => `${s.from} – ${s.to}`).join(", ");
}

/**
 * Get all days with their formatted hours for display.
 */
export function formatWorkingHoursForDisplay(
  workingHours: WorkingHoursRaw | null | undefined,
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

export function isTimeInAnySlot(time: string, slots: TimeSlot[]): boolean {
  if (!slots || slots.length === 0) return false;

  const timeInMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const tMin = timeInMinutes(time);

  return slots.some((slot) => {
    const startMin = timeInMinutes(slot.from);
    const endMin = timeInMinutes(slot.to);
    return tMin >= startMin && tMin < endMin;
  });
}
