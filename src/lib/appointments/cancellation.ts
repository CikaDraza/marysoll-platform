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
 *   open    u roku salona ILI u grace periodu  izmena i regularno otkazivanje
 *   late    van oba, a termin nije počeo       SAMO otkazivanje → no_show/late_cancel
 *   started now >= početak                     klijent ne radi ništa; status rešava salon
 *   unknown početak se ne može izračunati      klijent ne radi ništa
 *
 * GRACE PERIOD je sistemsko pravilo Marysoll-a, ne podešavanje salona.
 * Klijentkinja koja je htela 12h a kliknula 11h ne sme zbog pogrešnog klika
 * da dobije `late_cancel` zapis. Prvih 30 minuta od rezervacije važi puno
 * pravo na izmenu i otkazivanje — čak i kada je termin zakazan UNUTAR
 * salonovog roka.
 *
 * Posle tih 30 minuta važe pravila salona i izmena više nije dozvoljena.
 * Namerno: pomeranje termina u poslednji čas ostavlja salonu jednako prazan
 * slot kao otkazivanje, a klijent bi inače mogao da izbegne `late_cancel`
 * tako što prvo pomeri termin pa ga kasnije „regularno" otkaže.
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

/**
 * Koliko dugo posle rezervacije klijent sme da ispravi grešku, bez obzira na
 * rok salona. Sistemsko pravilo platforme — namerno NIJE tenant podešavanje,
 * da vlasnica salona ne mora da razume još jedan broj.
 */
export const BOOKING_GRACE_PERIOD_MINUTES = 30;

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
  "date" | "time" | "cancellationWindowHours" | "createdAt"
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

  // Započet termin nema ni grace period: klijent ga više ne otkazuje.
  if (now.getTime() >= start.getTime()) return "started";

  const cutoff = getCancellationCutoff(appointment, timezone);
  if (!cutoff) return "unknown";

  const withinSalonWindow = now.getTime() <= cutoff.getTime();
  const graceEnd = getGracePeriodEnd(appointment);
  const withinGrace = graceEnd !== null && now.getTime() <= graceEnd.getTime();

  return withinSalonWindow || withinGrace ? "open" : "late";
}

/**
 * Kraj grace perioda; `null` kada termin nema upotrebljiv `createdAt`.
 *
 * Bez vremena rezervacije nema grace-a — ali to ne oduzima ništa, jer se
 * pravo iz salonovog roka računa nezavisno.
 */
export function getGracePeriodEnd(
  appointment: Pick<IAppointment, "createdAt">,
): Date | null {
  if (!appointment.createdAt) return null;
  const createdAt = new Date(appointment.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;
  return new Date(
    createdAt.getTime() + BOOKING_GRACE_PERIOD_MINUTES * 60 * 1000,
  );
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
