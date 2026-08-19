/**
 * helpers/widgetAvailability.ts
 *
 * Zajednička logika dostupnosti za javne booking widgete
 * (HomepageAppointmentWidget, Y2KHomepageAppointmentWidget).
 *
 * Ranije je svaki widget imao svoju kopiju ovih funkcija; sada dele isti izvor
 * da bi "prvi slobodan dan" računao identično onome što widget crta.
 */

import { addDays, getDay } from "date-fns";
import type {
  DayOfWeek,
  ITimeSlot,
  ManualSlotsMap,
  WorkingHoursMap,
} from "@/types";
import { isManualSlotTaken, manualTimesForDate } from "@/helpers/manualSlots";

export const DAY_NAMES_SR: DayOfWeek[] = [
  "Nedelja",
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
];

/** Termin kakav javni endpoint vraća — samo polja bitna za zauzetost. */
export type BookedAppt = { date: string; time: string; duration?: number };

/** Koliko dana unapred tražimo prvi slobodan dan. */
export const AVAILABILITY_HORIZON_DAYS = 60;

export function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function getWorkingRange(
  workingHours: WorkingHoursMap | undefined,
  date: Date,
): { isWorking: boolean; start: string; end: string } {
  if (!workingHours) return { isWorking: false, start: "", end: "" };
  const dayName = DAY_NAMES_SR[getDay(date)] as DayOfWeek;
  const slots = (workingHours[dayName] ?? []) as ITimeSlot[];
  if (!slots.length) return { isWorking: false, start: "", end: "" };
  const starts = slots.map((s) => s.from).sort();
  const ends = slots.map((s) => s.to).sort();
  return { isWorking: true, start: starts[0], end: ends[ends.length - 1] };
}

export function generateSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  let cur = toMins(start);
  const endM = toMins(end);
  while (cur < endM) {
    const h = Math.floor(cur / 60)
      .toString()
      .padStart(2, "0");
    const m = (cur % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    cur += 30;
  }
  return slots;
}

export function isSlotBooked(
  appointments: BookedAppt[],
  dateStr: string,
  slot: string,
): boolean {
  const slotMin = toMins(slot);
  return appointments.some((a) => {
    if (a.date !== dateStr) return false;
    const startMin = toMins(a.time);
    const endMin = startMin + (a.duration || 60);
    return slotMin >= startMin && slotMin < endMin;
  });
}

export function isDayFullyBooked(
  appointments: BookedAppt[],
  slots: string[],
  dateStr: string,
): boolean {
  if (!slots.length) return false;
  return slots.every((slot) => isSlotBooked(appointments, dateStr, slot));
}

type AvailabilityArgs = {
  workingHours: WorkingHoursMap | undefined;
  manualSlots: ManualSlotsMap | undefined;
  isManual: boolean;
  appointments: BookedAppt[];
};

/**
 * Da li dan ima bar jedan termin koji je slobodan i još nije prošao.
 * Isti kriterijum kao DayView (zauzeto / prošlo se ne mogu kliknuti).
 */
export function hasFreeSlot(
  day: Date,
  { workingHours, manualSlots, isManual, appointments }: AvailabilityArgs,
  now: Date = new Date(),
): boolean {
  const dateStr = toDateStr(day);

  if (isManual) {
    return manualTimesForDate(manualSlots, dateStr).some((slot) => {
      if (new Date(`${dateStr}T${slot.time}`) < now) return false;
      return !isManualSlotTaken(
        appointments,
        dateStr,
        toMins(slot.time),
        slot.duration ?? 60,
      );
    });
  }

  const range = getWorkingRange(workingHours, day);
  if (!range.isWorking) return false;
  return generateSlots(range.start, range.end).some((time) => {
    if (new Date(`${dateStr}T${time}`) < now) return false;
    return !isSlotBooked(appointments, dateStr, time);
  });
}

/**
 * Prvi dan (počev od `from`) koji ima bar jedan slobodan termin.
 * Vraća `null` ako ga nema u okviru horizonta — tada widget ostaje na današnjem
 * danu i klijent vidi poruku da je popunjeno.
 */
export function findFirstAvailableDay(
  args: AvailabilityArgs,
  from: Date = new Date(),
  horizonDays: number = AVAILABILITY_HORIZON_DAYS,
): Date | null {
  const now = new Date();
  for (let i = 0; i <= horizonDays; i++) {
    const day = addDays(from, i);
    if (hasFreeSlot(day, args, now)) return day;
  }
  return null;
}
