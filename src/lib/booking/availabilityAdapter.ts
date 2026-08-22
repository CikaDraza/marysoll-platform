/**
 * Adapter: Marysoll domen → `@panta/booking-engine`.
 *
 * Ovde, i samo ovde, žive pojmovi koje engine ne sme da zna:
 *   · srpski nazivi dana kao ključevi `workingHours`,
 *   · legacy zapis radnog vremena kao string ("08:00 - 17:00"),
 *   · `Appointment` statusi i koji od njih zaista blokiraju termin,
 *   · `SalonProfile` oblik (`availabilityMode`, `manualSlots`, `vacations`),
 *   · pretpostavka da salon radi po Europe/Belgrade.
 *
 * Isti obrazac kao `lib/platform/theme-client.ts` prema `@panta/theme-engine`.
 * Kada stigne Consultation (Slice 7) i Education (Slice 11), oni dobijaju svoj
 * adapter pored ovog — engine se ne dira:
 *
 *   Service              ─┐
 *   ConsultationOffering ─┼─→ durationMinutes + resourceKey → AvailabilityQuery
 *   EducationSession     ─┘
 */

import {
  addDays,
  computeAvailability,
  // Konverzija zone ide kroz engine — adapter ne sme da pravi svoju kopiju.
  zonedTimeToUtc,
  type AvailabilityBand,
  type AvailabilityQuery,
  type AvailabilityResult,
  type ManualSlot,
  type Occupancy,
  type TimeRange,
  type VacationRange,
  type WeekdayIndex,
} from "@panta/booking-engine";
import type {
  DayOfWeek,
  IVacation,
  ManualSlotsMap,
  WorkingHoursMap,
} from "@/types";

/** Platforma radi po beogradskom vremenu; engine zonu traži eksplicitno. */
export const SALON_TIMEZONE = "Europe/Belgrade";

/** `Date#getDay()` indeks → ključ u `workingHours` mapi. */
const WEEKDAY_KEYS: DayOfWeek[] = [
  "Nedelja",
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
];

/**
 * Statusi koji NE zauzimaju termin. Sve ostalo blokira — uključujući `pending`,
 * jer neodobren zahtev i dalje drži vreme dok ga vlasnica ne reši.
 */
export const NON_BLOCKING_STATUSES = new Set([
  "appointment_rejected",
  "appointment_cancelled",
]);

/** Termin kakav rute i widgeti već imaju pri ruci. */
export interface BookedAppointment {
  date: string;
  time: string;
  duration?: number;
  status?: string;
}

export interface SalonAvailabilityProfile {
  workingHours?: WorkingHoursMap | Record<string, unknown> | null;
  vacations?: IVacation[] | null;
  availabilityMode?: "workingHours" | "manualSlots" | null;
  manualSlots?: ManualSlotsMap | null;
}

/**
 * Jedan dan radnog vremena → opsezi.
 *
 * Podržava oba zatečena zapisa: niz `{ from, to }` i legacy string
 * "08:00 - 17:00". Nepoznat oblik je neradan dan, ne greška — profil salona
 * je godinama pisan iz više mesta.
 */
export function parseDayRanges(value: unknown): TimeRange[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((slot) => {
        if (!slot || typeof slot !== "object") return null;
        const s = slot as Record<string, unknown>;
        const from = String(s.from ?? "").trim();
        const to = String(s.to ?? "").trim();
        return from && to ? { from, to } : null;
      })
      .filter((r): r is TimeRange => r !== null);
  }

  if (typeof value === "string" && value.trim()) {
    const match = value.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    if (match) return [{ from: match[1], to: match[2] }];
  }

  return [];
}

/** Cela `workingHours` mapa → raspored po indeksu dana koji engine razume. */
export function toSchedule(
  workingHours: SalonAvailabilityProfile["workingHours"],
): Partial<Record<WeekdayIndex, TimeRange[]>> {
  if (!workingHours || typeof workingHours !== "object") return {};

  const schedule: Partial<Record<WeekdayIndex, TimeRange[]>> = {};
  for (let index = 0; index < WEEKDAY_KEYS.length; index++) {
    const ranges = parseDayRanges(
      (workingHours as Record<string, unknown>)[WEEKDAY_KEYS[index]],
    );
    if (ranges.length) schedule[index as WeekdayIndex] = ranges;
  }
  return schedule;
}

/**
 * Odmori. Zatečeni model zna samo cele dane; engine ume i delimičan dan, pa se
 * `fromTime`/`toTime` prenose ako se jednom pojave u profilu.
 */
export function toVacations(
  vacations: SalonAvailabilityProfile["vacations"],
): VacationRange[] {
  if (!Array.isArray(vacations)) return [];
  return vacations
    .filter((v) => v && typeof v.from === "string" && typeof v.to === "string")
    .map((v) => {
      const extra = v as IVacation & { fromTime?: string; toTime?: string };
      return {
        from: v.from,
        to: v.to,
        ...(extra.fromTime ? { fromTime: extra.fromTime } : {}),
        ...(extra.toTime ? { toTime: extra.toTime } : {}),
      };
    });
}

/** Ručni termini za JEDAN datum — mapa je ključevana datumom. */
export function toManualSlots(
  manualSlots: SalonAvailabilityProfile["manualSlots"],
  localDate: string,
): ManualSlot[] {
  const list = manualSlots?.[localDate];
  if (!Array.isArray(list)) return [];
  return list
    .filter((slot) => slot && typeof slot.time === "string")
    .map((slot) => ({
      time: slot.time,
      ...(typeof slot.duration === "number" ? { durationMinutes: slot.duration } : {}),
    }));
}

/**
 * Termini → zauzetost kao INSTANTI.
 *
 * Otkazani i odbijeni ispadaju ovde, a ne u engine-u: status je domenski pojam.
 * Trajanje bez vrednosti je 60 min — ista pretpostavka koju su nosile sve
 * zatečene implementacije.
 */
export function toOccupancies(
  appointments: BookedAppointment[] | undefined,
  timezone: string = SALON_TIMEZONE,
): Occupancy[] {
  if (!Array.isArray(appointments)) return [];

  return appointments
    .filter((a) => a?.date && a?.time)
    .filter((a) => !a.status || !NON_BLOCKING_STATUSES.has(a.status))
    .map((a) => {
      const [h, m] = a.time.split(":").map(Number);
      const startsAt = zonedTimeToUtc(a.date, h * 60 + (m || 0), timezone);
      const minutes = typeof a.duration === "number" && a.duration > 0 ? a.duration : 60;
      return { startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60_000) };
    });
}

export interface BuildQueryInput {
  tenantId: string;
  localDate: string;
  durationMinutes: number;
  profile: SalonAvailabilityProfile;
  appointments?: BookedAppointment[];
  /** Canonical UTC occupancy; ne pretvara se nazad u legacy date/time oblik. */
  occupancies?: Occupancy[];
  /** Nad čim se rezerviše. Do Slice 5 salon ima jedan resurs. */
  resourceKey?: string;
  timezone?: string;
  stepMinutes?: number;
  now?: Date;
  bands?: AvailabilityBand[];
  preferredHours?: TimeRange[];
}

/** Jedini most: domen → `AvailabilityQuery`. */
export function buildAvailabilityQuery(input: BuildQueryInput): AvailabilityQuery {
  const timezone = input.timezone ?? SALON_TIMEZONE;
  const isManual = input.profile.availabilityMode === "manualSlots";

  return {
    tenantId: input.tenantId,
    resourceKey: input.resourceKey ?? "salon",
    localDate: input.localDate,
    timezone,
    durationMinutes: input.durationMinutes,
    schedule: toSchedule(input.profile.workingHours),
    vacations: toVacations(input.profile.vacations),
    ...(isManual
      ? { manualSlots: toManualSlots(input.profile.manualSlots, input.localDate) }
      : {}),
    occupancies: [
      ...toOccupancies(input.appointments, timezone),
      ...(input.occupancies ?? []),
    ],
    ...(input.stepMinutes ? { stepMinutes: input.stepMinutes } : {}),
    ...(input.now ? { now: input.now } : {}),
    ...(input.bands ? { bands: input.bands } : {}),
    ...(input.preferredHours ? { preferredHours: input.preferredHours } : {}),
  };
}

/** Pun rezultat za jedan dan. */
export function availabilityForDate(input: BuildQueryInput): AvailabilityResult {
  return computeAvailability(buildAvailabilityQuery(input));
}

/**
 * "HH:MM" lista — oblik koji dropdown-i i widgeti već očekuju.
 * Zamenjuje `availableTimesForDate` iz `helpers/parseWorkingHours`.
 */
export function availableTimesForDate(input: BuildQueryInput): string[] {
  return availabilityForDate(input).slots.map((slot) => slot.localStart);
}

/**
 * Prvi dan sa slobodnim terminom — zamenjuje `findFirstAvailableDay` iz widgeta.
 *
 * Upit se gradi IZNOVA za svaki dan. Ručni termini su ključevani datumom, a
 * odmori zavise od datuma, pa bi petlja koja menja samo `localDate` nosila
 * slotove prvog dana kroz ceo horizont — svaki dan bi izgledao kao prvi.
 */
export function findFirstAvailableDate(
  input: BuildQueryInput,
  options: { fromDate: string; horizonDays?: number },
): string | null {
  const horizon = Math.max(options.horizonDays ?? 60, 0);
  for (let offset = 0; offset <= horizon; offset++) {
    const localDate = addDays(options.fromDate, offset);
    const slots = computeAvailability(
      buildAvailabilityQuery({ ...input, localDate }),
    ).slots;
    if (slots.length) return localDate;
  }
  return null;
}

// ─── Prikaz: widget crta i zauzete termine, ne samo slobodne ─────────────────

/** Jedan termin u mreži widgeta — zauzet i prošao su RAZLIČITA stanja. */
export interface DaySlotState {
  time: string;
  endTime: string;
  durationMinutes: number;
  taken: boolean;
  past: boolean;
}

export type DayAvailabilityState = "closed" | "full" | "free";

/**
 * Svi termini dana sa stanjem.
 *
 * Core namerno vraća SAMO slobodne — zauzetost je njegov filter, ne izlaz. Zato
 * se ovde računa dvaput: jednom bez zauzetosti (puna ponuda dana, ono što
 * widget crta) i jednom sa njom (šta je stvarno slobodno). Alternativa bi bila
 * da core vraća i odbijene kandidate sa razlogom — to je prikaz, i ne pripada
 * mu dok ga ne zatraži više od jednog potrošača.
 */
export function daySlotStates(input: BuildQueryInput): DaySlotState[] {
  const offered = computeAvailability(
    buildAvailabilityQuery({ ...input, appointments: [], now: undefined }),
  ).slots;

  const freeStarts = new Set(
    computeAvailability(
      buildAvailabilityQuery({ ...input, now: undefined }),
    ).slots.map((slot) => slot.localStart),
  );

  const nowMs = (input.now ?? new Date()).getTime();

  return offered.map((slot) => ({
    time: slot.localStart,
    endTime: slot.localEnd,
    durationMinutes: Math.round(
      (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000,
    ),
    taken: !freeStarts.has(slot.localStart),
    past: slot.startsAt.getTime() < nowMs,
  }));
}

/**
 * Stanje dana za mesečni prikaz.
 *   `closed` — salon tog dana ne nudi ništa (neradan dan ili odmor),
 *   `full`   — nudi, ali je sve zauzeto ili prošlo,
 *   `free`   — ima bar jedan termin koji se može kliknuti.
 */
export function dayAvailabilityState(
  input: BuildQueryInput,
): DayAvailabilityState {
  const slots = daySlotStates(input);
  if (!slots.length) return "closed";
  return slots.some((slot) => !slot.taken && !slot.past) ? "free" : "full";
}
