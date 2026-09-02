/**
 * Ko odlučuje da li usluga traži zahtev klijentkinje.
 *
 * Odluka je do 2026-09-02 bila hardkodovana na PLATFORMSKOJ kategoriji
 * (`CATEGORY_MAP.nails.requiresIntake`). To je značilo da salon ne može
 * uključiti zahtev za uslugu izvan noktiju, ni isključiti ga za uslugu noktiju
 * kojoj ne treba — a odluku je nosio kod, ne vlasnica salona.
 *
 * Sada je vlasnik USLUGA:
 *
 *     service.bookingIntake.enabled === true
 *
 * Ovaj resolver je JEDINA istina. Ni UI ni server flow ne smeju gledati
 * `categorySlug`, `CATEGORY_MAP`, temu ni tenant slug.
 */
import type { IService } from "@/types";

export interface ResolvedServiceIntake {
  enabled: boolean;
}

/** Minimum koji resolver čita — namerno uže od cele usluge. */
type IntakeFields = Pick<IService, "bookingIntake">;

export function resolveServiceBookingIntake(
  service: IntakeFields | null | undefined,
): ResolvedServiceIntake {
  return { enabled: service?.bookingIntake?.enabled === true };
}

/** Kratka provera za mesta kojima treba samo boolean. */
export function serviceRequiresIntake(
  service: IntakeFields | null | undefined,
): boolean {
  return resolveServiceBookingIntake(service).enabled;
}
