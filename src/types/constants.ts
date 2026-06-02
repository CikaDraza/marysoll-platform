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

export const SERVICE_TYPES = ["single", "variant", "group"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const HOME_PAGE_POSITIONS = ["main", "second", "third", "none"] as const;
export type HomePagePositionValue = (typeof HOME_PAGE_POSITIONS)[number];

export const PLAN_TYPES = ["maria", "claudia", "kiki", "enterprise"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const TENANT_STATUSES = [
  "active",
  "suspended",
  "pending",
  "cancelled",
] as const;
export type TenantStatusValue = (typeof TENANT_STATUSES)[number];

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
