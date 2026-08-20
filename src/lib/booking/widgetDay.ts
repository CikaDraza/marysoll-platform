/**
 * Dan onako kako ga javni widget crta — jedan poziv umesto pet helpera.
 *
 * Zamenjuje `helpers/widgetAvailability.ts`, koji je imao svoju kopiju pravila
 * i dva buga: `getWorkingRange()` je uzimao min(from)/max(to) preko opsega dana
 * (pauza je nestajala), a `isSlotBooked()` je gledao samo POČETAK kandidata
 * (60-minutni termin u 11:30 je prolazio pored zauzetog u 12:00).
 *
 * Sve iza ovoga ide kroz `@panta/booking-engine` — ista pravila koja koriste
 * `/api/slots`, modal i, od Slice 5, Booking Engine.
 */

import type { IVacation, ManualSlotsMap, WorkingHoursMap } from "@/types";
import {
  dayAvailabilityState,
  daySlotStates,
  findFirstAvailableDate,
  type BookedAppointment,
  type DaySlotState,
} from "./availabilityAdapter";

/** Mreža widgeta je uvek na 30 minuta — trajanje usluge bira se kasnije. */
const WIDGET_STEP_MINUTES = 30;

export interface WidgetAvailabilityArgs {
  workingHours?: WorkingHoursMap;
  manualSlots?: ManualSlotsMap;
  isManual: boolean;
  appointments: BookedAppointment[];
  /** Odmori — widget ih ranije nije ni primao, pa se moglo zakazati usred njih. */
  vacations?: IVacation[];
  now?: Date;
}

export interface WidgetDay {
  dateStr: string;
  /** Salon tog dana nudi bar nešto (radan dan i nije odmor). */
  isWorking: boolean;
  slots: DaySlotState[];
  bookedCount: number;
  /** Radi, ali nema nijedan slobodan i budući termin. */
  fullyBooked: boolean;
}

function toInput(dateStr: string, args: WidgetAvailabilityArgs) {
  return {
    tenantId: "widget",
    localDate: dateStr,
    durationMinutes: WIDGET_STEP_MINUTES,
    stepMinutes: WIDGET_STEP_MINUTES,
    profile: {
      workingHours: args.workingHours,
      vacations: args.vacations,
      availabilityMode: args.isManual ? ("manualSlots" as const) : ("workingHours" as const),
      manualSlots: args.manualSlots,
    },
    appointments: args.appointments,
    ...(args.now ? { now: args.now } : {}),
  };
}

export function widgetDay(
  dateStr: string,
  args: WidgetAvailabilityArgs,
): WidgetDay {
  const input = toInput(dateStr, args);
  const slots = daySlotStates(input);
  const state = dayAvailabilityState(input);

  return {
    dateStr,
    isWorking: state !== "closed",
    slots,
    bookedCount: slots.filter((slot) => slot.taken).length,
    fullyBooked: state === "full",
  };
}

/**
 * Prvi dan sa slobodnim terminom, kao "YYYY-MM-DD".
 *
 * Ranije je ovo bila zasebna kopija pravila, pa je „prvi slobodan dan" umeo da
 * pokaže dan koji dropdown zatim odbije.
 */
export function firstAvailableDate(
  args: WidgetAvailabilityArgs,
  fromDate: string,
  horizonDays = 60,
): string | null {
  // Traženje prvog slobodnog dana UVEK preskače prošlost — inače bi za današnji
  // dan vratilo termin koji je već prošao. Zato `now` ovde ima podrazumevanu
  // vrednost, za razliku od `widgetDay`, gde je prošlost samo oznaka na pločici.
  const withNow = { ...args, now: args.now ?? new Date() };
  return findFirstAvailableDate(toInput(fromDate, withNow), {
    fromDate,
    horizonDays,
  });
}
