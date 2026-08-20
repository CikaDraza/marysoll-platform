/**
 * `computeAvailability` — jedina definicija „slobodan termin" na platformi.
 *
 * Čista funkcija: bez baze, bez mreže, bez `Date.now()`. Isti upit uvek daje
 * isti rezultat, pa je i regresija protiv zatečenih implementacija moguća.
 *
 * Redosled je bitan i namerno je ovakav:
 *   raspored dana → minus pauze → minus odmori → kandidati (korak ili ručni
 *   termini) → odbaci one koji ne postoje u zoni (DST rupa) → odbaci prošle →
 *   odbaci one koji se preklapaju sa zauzetošću → klasifikuj.
 */

import {
  addDays,
  endMinutesOf,
  localTimeExists,
  minutesToTime,
  timeToMinutes,
  weekdayOf,
  zonedTimeToUtc,
} from "./time";
import { normalize, overlaps, subtract, type MinuteInterval } from "./intervals";
import type {
  AvailabilityClass,
  AvailabilityQuery,
  AvailabilityResult,
  AvailabilitySlot,
  TimeRange,
  VacationRange,
  WeekdayIndex,
} from "./types";

const DEFAULT_STEP_MINUTES = 30;
const WHOLE_DAY: MinuteInterval = { start: 0, end: 1440 };

function rangesToIntervals(ranges: TimeRange[] | undefined): MinuteInterval[] {
  if (!ranges?.length) return [];
  return ranges.map((r) => ({
    start: timeToMinutes(r.from),
    end: endMinutesOf(r.to),
  }));
}

/**
 * Deo dana koji je pokriven odmorom.
 *
 * Datumi su uključivi na oba kraja. `fromTime`/`toTime` važe samo na svom
 * kraju odmora — sredina višednevnog odmora je uvek ceo dan.
 */
function vacationCutsFor(
  date: string,
  vacations: VacationRange[] | undefined,
): MinuteInterval[] {
  if (!vacations?.length) return [];
  const cuts: MinuteInterval[] = [];

  for (const vacation of vacations) {
    if (!vacation?.from || !vacation?.to) continue;
    if (date < vacation.from || date > vacation.to) continue;

    const isFirstDay = date === vacation.from;
    const isLastDay = date === vacation.to;

    const start =
      isFirstDay && vacation.fromTime ? timeToMinutes(vacation.fromTime) : 0;
    const end =
      isLastDay && vacation.toTime ? endMinutesOf(vacation.toTime) : 1440;

    if (end > start) cuts.push({ start, end });
  }
  return normalize(cuts);
}

function classify(
  startMinutes: number,
  bands: AvailabilityQuery["bands"],
): AvailabilityClass {
  if (!bands?.length) return "standard";
  for (const band of bands) {
    const start = timeToMinutes(band.from);
    const end = endMinutesOf(band.to);
    if (startMinutes >= start && startMinutes < end) return band.class;
  }
  return "standard";
}

function isOutsidePreferred(
  candidate: MinuteInterval,
  preferred: TimeRange[] | undefined,
): boolean {
  if (!preferred?.length) return false;
  return !rangesToIntervals(preferred).some(
    (range) => candidate.start >= range.start && candidate.end <= range.end,
  );
}

/** Kandidati u režimu rasporeda: korak kroz otvorene intervale. */
function scheduledCandidates(
  open: MinuteInterval[],
  durationMinutes: number,
  stepMinutes: number,
): MinuteInterval[] {
  const candidates: MinuteInterval[] = [];
  for (const interval of open) {
    // `+ duration <= end` — termin mora CEO da stane; 60-minutni ne ulazi u
    // 30-minutnu rupu ni kad joj je početak slobodan.
    for (
      let start = interval.start;
      start + durationMinutes <= interval.end;
      start += stepMinutes
    ) {
      candidates.push({ start, end: start + durationMinutes });
    }
  }
  return candidates;
}

/** Kandidati u režimu ručnih termina: tačno ono što je salon definisao. */
function manualCandidates(
  query: AvailabilityQuery,
  fallbackDuration: number,
): MinuteInterval[] {
  return (query.manualSlots ?? [])
    .filter((slot) => typeof slot?.time === "string")
    .map((slot) => {
      const start = timeToMinutes(slot.time);
      const duration = slot.durationMinutes ?? fallbackDuration;
      return { start, end: start + duration };
    })
    .filter((interval) => Number.isFinite(interval.start) && interval.end > interval.start);
}

export function computeAvailability(
  query: AvailabilityQuery,
): AvailabilityResult {
  const {
    localDate,
    timezone,
    durationMinutes,
    stepMinutes = DEFAULT_STEP_MINUTES,
    now,
  } = query;

  const empty: AvailabilityResult = {
    date: localDate,
    timezone,
    slots: [],
  };
  if (!localDate || !timezone) return empty;

  const duration = Math.max(Math.trunc(durationMinutes) || 0, 1);
  const step = Math.max(Math.trunc(stepMinutes) || 0, 1);
  const weekday = weekdayOf(localDate) as WeekdayIndex;

  const vacationCuts = vacationCutsFor(localDate, query.vacations);
  const useManual = !!query.manualSlots?.length;

  let candidates: MinuteInterval[];
  if (useManual) {
    // Odmor gasi i ručne termine — odmor je zatvaranje salona, ne podešavanje
    // rasporeda. Zato se ovde ne seče, nego se kandidat koji ga dodiruje odbija.
    candidates = manualCandidates(query, duration).filter(
      (candidate) => !vacationCuts.some((cut) => overlaps(candidate, cut)),
    );
  } else {
    const scheduled = rangesToIntervals(query.schedule?.[weekday]);
    if (!scheduled.length) return empty; // neradan dan
    const open = subtract(scheduled, [
      ...rangesToIntervals(query.breaks?.[weekday]),
      ...vacationCuts,
    ]);
    candidates = scheduledCandidates(open, duration, step);
  }

  if (!candidates.length) return empty;

  const occupancies = (query.occupancies ?? []).filter(
    (o) => o?.startsAt instanceof Date && o?.endsAt instanceof Date,
  );

  const slots: AvailabilitySlot[] = [];
  for (const candidate of candidates) {
    if (candidate.end > WHOLE_DAY.end) continue;
    // DST rupa: lokalno vreme koje ne postoji nema instant, pa se ne nudi.
    if (!localTimeExists(localDate, candidate.start, timezone)) continue;

    const startsAt = zonedTimeToUtc(localDate, candidate.start, timezone);
    const endsAt = zonedTimeToUtc(localDate, candidate.end, timezone);

    if (now && startsAt.getTime() < now.getTime()) continue;

    const taken = occupancies.some(
      (o) => startsAt.getTime() < o.endsAt.getTime() && o.startsAt.getTime() < endsAt.getTime(),
    );
    if (taken) continue;

    slots.push({
      startsAt,
      endsAt,
      localStart: minutesToTime(candidate.start),
      localEnd: minutesToTime(candidate.end),
      availabilityClass: classify(candidate.start, query.bands),
      outsidePreferredHours: isOutsidePreferred(candidate, query.preferredHours),
    });
  }

  slots.sort(
    (a, b) =>
      a.startsAt.getTime() - b.startsAt.getTime() ||
      a.endsAt.getTime() - b.endsAt.getTime(),
  );

  return { date: localDate, timezone, slots };
}

/** Ima li dan ijedan slobodan termin — `findFirstAvailableDay` staje na prvom. */
export function hasAnyAvailability(query: AvailabilityQuery): boolean {
  return computeAvailability(query).slots.length > 0;
}

/**
 * Prvi dan (od `fromDate`) koji ima ijedan slobodan termin, ili `null` u okviru
 * horizonta. Widget je ovo računao svojom kopijom pravila, pa je „prvi slobodan
 * dan" umeo da pokaže dan koji dropdown zatim odbije.
 */
export function findFirstAvailableDay(
  query: AvailabilityQuery,
  options: { fromDate: string; horizonDays?: number },
): string | null {
  const horizon = Math.max(options.horizonDays ?? 60, 0);
  for (let offset = 0; offset <= horizon; offset++) {
    const localDate = addDays(options.fromDate, offset);
    if (hasAnyAvailability({ ...query, localDate })) return localDate;
  }
  return null;
}
