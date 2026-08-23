import type { ReservationStatus } from "./contracts";
import { RESERVATION_STATUSES } from "./contracts";
import type { AppointmentStatusValue } from "@/types/constants";

/**
 * Da li zapis u datom statusu drži svoj interval.
 *
 * Politika je TROSTRUKA, ne binarna, jer legacy i canonical model još nisu
 * semantički isti i ne smeju se izjednačiti prostim `isBlockingStatus()`:
 *
 * - `blocking`            — drži interval bez obzira na vreme;
 * - `released`            — ne drži ništa;
 * - `blocking_until_end`  — drži interval dok se ne završi, pa se oslobađa.
 *
 * Treća vrednost postoji zbog jedne konkretne legacy asimetrije. Kasni otkaz
 * klijenta postavlja `Appointment.status = "no_show"` u TRENUTKU otkaza
 * (`clientFlows.cancelAppointmentAsClient`), dakle pre kraja termina, a ručni
 * admin put sme isto i za `completed` — `update/[id]` proverava samo da je
 * akter admin, ne i da je termin prošao. Canonical strana to ne može: za
 * `complete` i `mark_no_show` `lifecycleTarget()` baca `BOOKING_INVALID_STATE`
 * pre `endsAt`, a late cancel namerno ostavlja status nepromenjen da bi
 * interval ostao blokiran do kraja.
 *
 * Zato canonical `no_show`/`completed` jesu `released`, a legacy nisu: tamo bi
 * to oslobodilo interval koji stvarno traje ili tek dolazi.
 */
export type OccupancyStatusPolicy = "blocking" | "released" | "blocking_until_end";

const LEGACY_APPOINTMENT_POLICY: Record<AppointmentStatusValue, OccupancyStatusPolicy> = {
  pending: "blocking",
  appointment_approved: "blocking",
  appointment_rescheduled: "blocking",
  appointment_rejected: "released",
  appointment_cancelled: "released",
  completed: "blocking_until_end",
  no_show: "blocking_until_end",
};

const RESERVATION_POLICY: Record<ReservationStatus, OccupancyStatusPolicy> = {
  pending: "blocking",
  confirmed: "blocking",
  released: "released",
  completed: "released",
  no_show: "released",
};

/**
 * Nepoznat status blokira. Fail-safe smer koji je legacy blocklist već imao:
 * bolje odbiti termin nego tiho dozvoliti double-booking zbog statusa koji
 * ova tabela još ne poznaje.
 */
export function legacyAppointmentOccupancyPolicy(
  status: string | null | undefined,
): OccupancyStatusPolicy {
  if (!status) return "blocking";
  return LEGACY_APPOINTMENT_POLICY[status as AppointmentStatusValue] ?? "blocking";
}

export function reservationOccupancyPolicy(
  status: string | null | undefined,
): OccupancyStatusPolicy {
  if (!status) return "blocking";
  return RESERVATION_POLICY[status as ReservationStatus] ?? "blocking";
}

/**
 * Da li zapis blokira u datom trenutku.
 *
 * `now` je opciono: bez njega se `blocking_until_end` tretira kao `blocking`.
 * To je isti fail-safe smer i čuva zatečeno ponašanje svakog pozivaoca koji
 * nema pojam „sada" (npr. read putanja koja ne prosleđuje `now`).
 */
export function policyBlocksAt(
  policy: OccupancyStatusPolicy,
  endsAt: Date,
  now?: Date,
): boolean {
  if (policy === "released") return false;
  if (policy === "blocking") return true;
  return !now || now.getTime() < endsAt.getTime();
}

/** Canonical statusi koji uvek blokiraju — izvor za `$in` filter u upitu. */
export const BLOCKING_RESERVATION_STATUSES: ReservationStatus[] =
  RESERVATION_STATUSES.filter(
    (status) => RESERVATION_POLICY[status] !== "released",
  );
