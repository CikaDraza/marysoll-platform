/**
 * types/constants.ts
 *
 * Runtime konstante koje se ne mogu exportovati iz .d.ts declaration fajlova.
 * Može se importovati i u server i client komponentama.
 */

import type { DayOfWeek, WorkingHoursMap } from "./index";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
  "Nedelja",
];

export const EMPTY_WORKING_HOURS: WorkingHoursMap = {
  Ponedeljak: [],
  Utorak: [],
  Sreda: [],
  Četvrtak: [],
  Petak: [],
  Subota: [],
  Nedelja: [],
};

export const APPOINTMENT_STATUSES = [
  "pending",
  "appointment_approved",
  "appointment_rejected",
  "appointment_rescheduled",
  "appointment_cancelled",
  "completed",
  "no_show",
] as const;
export type AppointmentStatusValue = (typeof APPOINTMENT_STATUSES)[number];
