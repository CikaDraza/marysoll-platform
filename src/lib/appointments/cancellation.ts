/**
 * Rokovi za KLIJENTSKE akcije nad terminom (izmena i otkazivanje).
 *
 * Canonical rok:
 *
 *     cutoff = početakTerminaUZoniSalona − cancellationWindowHours
 *
 * Ranije se računalo `createdAt + N sati`, što je značilo da klijentkinja koja
 * zakaže tri dana unapred gubi pravo na otkazivanje sat vremena POSLE
 * rezervacije — a ne sat pre termina. Rok mora da visi o početku termina, jer
 * salon štiti slobodan termin, ne trenutak klikanja.
 *
 * Zona ulazi kao argument i računa se preko booking-engine helpera. Naivni
 * `new Date("2026-09-12T14:00")` parsira u zoni PROCESA — na Vercelu UTC — pa
 * bi rok bio pomeren za sat ili dva, a na dan pomeranja sata i za ceo sat.
 *
 * Tri faze, i van njih nema četvrte:
 *
 *   open    now <= cutoff                      izmena i regularno otkazivanje
 *   late    cutoff < now < početak             SAMO otkazivanje → no_show/late_cancel
 *   started now >= početak                     klijent ne radi ništa; status rešava salon
 *   unknown početak se ne može izračunati      klijent ne radi ništa
 *
 * `started` postoji da klijentkinja ne bi dva sata POSLE termina kliknula
 * „Otkaži ipak" — to više nije otkazivanje nego nedolazak.
 *
 * `unknown` je fail-SAFE, ne fail-open: ako sistem ne ume pouzdano da odredi
 * početak termina, ne sme da autorizuje ni otkazivanje ni pomeranje nad tim
 * zapisom. UI to prikazuje kao „kontaktirajte salon", a mutacija odbija.
 */
import { timeToMinutes, zonedTimeToUtc } from "@panta/booking-engine";
import { SALON_TIMEZONE } from "@/lib/booking/availabilityAdapter";
import type { IAppointment } from "@/types";

const DEFAULT_CANCELLATION_WINDOW_HOURS = 1;

/** Statusi u kojima termin više ne prolazi kroz klijentske akcije. */
export const CLIENT_FINAL_STATUSES = [
  "appointment_cancelled",
  "completed",
  "no_show",
] as const;

export function isClientActionableStatus(status: string | undefined): boolean {
  return !CLIENT_FINAL_STATUSES.includes(
    status as (typeof CLIENT_FINAL_STATUSES)[number],
  );
}

/** Polja koja rok stvarno čita — namerno uže od celog termina. */
type TimingFields = Pick<
  IAppointment,
  "date" | "time" | "cancellationWindowHours"
>;

function normalizeWindowHours(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return DEFAULT_CANCELLATION_WINDOW_HOURS;
  }
  return numeric;
}

/** Instant početka termina; `null` kada datum/vreme nisu upotrebljivi. */
export function getAppointmentStart(
  appointment: Pick<IAppointment, "date" | "time">,
  timezone: string = SALON_TIMEZONE,
): Date | null {
  if (!appointment.date || !appointment.time) return null;
  const minutes = timeToMinutes(appointment.time);
  if (!Number.isFinite(minutes)) return null;
  const start = zonedTimeToUtc(appointment.date, minutes, timezone);
  return Number.isNaN(start.getTime()) ? null : start;
}

/** Poslednji trenutak za regularnu izmenu/otkazivanje. */
export function getCancellationCutoff(
  appointment: TimingFields,
  timezone: string = SALON_TIMEZONE,
): Date | null {
  const start = getAppointmentStart(appointment, timezone);
  if (!start) return null;
  const hours = normalizeWindowHours(appointment.cancellationWindowHours);
  return new Date(start.getTime() - hours * 60 * 60 * 1000);
}

export type ClientAppointmentPhase =
  | "open"
  | "late"
  | "started"
  | "unknown";

/**
 * Faza termina iz ugla klijenta.
 *
 * Nečitljiv datum/vreme daje `unknown`, ne `open`. Rok je autorizaciona
 * odluka: pustiti otkazivanje ili pomeranje nad zapisom čiji se početak ne
 * može izračunati znači pisati u bazu na osnovu pretpostavke.
 */
export function clientAppointmentPhase(
  appointment: TimingFields,
  now: Date = new Date(),
  timezone: string = SALON_TIMEZONE,
): ClientAppointmentPhase {
  const start = getAppointmentStart(appointment, timezone);
  if (!start) return "unknown";
  if (now.getTime() >= start.getTime()) return "started";
  const cutoff = getCancellationCutoff(appointment, timezone);
  if (!cutoff) return "unknown";
  return now.getTime() <= cutoff.getTime() ? "open" : "late";
}

/**
 * Izmena termina — dozvoljena samo do roka.
 *
 * Namerno odvojen ulaz od otkazivanja iako oba danas dele isti
 * `cancellationWindowHours`: kad salon zatraži poseban `editBeforeHours`,
 * menja se telo ove funkcije, a nijedan pozivalac.
 */
export function canClientEditAppointment(
  appointment: TimingFields,
  now: Date = new Date(),
  timezone: string = SALON_TIMEZONE,
): boolean {
  return clientAppointmentPhase(appointment, now, timezone) === "open";
}

/** Regularno otkazivanje — u roku, bez posledica. */
export function canClientCancelAppointment(
  appointment: TimingFields,
  now: Date = new Date(),
  timezone: string = SALON_TIMEZONE,
): boolean {
  return clientAppointmentPhase(appointment, now, timezone) === "open";
}

/**
 * Kasno otkazivanje — rok je prošao, ali termin još nije počeo.
 * Dugme ostaje dostupno; ishod je `no_show` + `late_cancel`.
 */
export function canClientCancelLate(
  appointment: TimingFields,
  now: Date = new Date(),
  timezone: string = SALON_TIMEZONE,
): boolean {
  return clientAppointmentPhase(appointment, now, timezone) === "late";
}

export function hasAppointmentStarted(
  appointment: Pick<IAppointment, "date" | "time">,
  now: Date = new Date(),
  timezone: string = SALON_TIMEZONE,
): boolean {
  const start = getAppointmentStart(appointment, timezone);
  return start ? now.getTime() >= start.getTime() : false;
}
