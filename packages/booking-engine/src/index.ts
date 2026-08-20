/**
 * @panta/booking-engine — availability core (T3, Slice 3).
 *
 * Engine NE zna: Service, Consultation, EducationSession, Appointment, temu,
 * salon ni cenu. Adapteri u aplikaciji prevode domen u `AvailabilityQuery`.
 *
 * Occupancy je ovde ULAZ, ne izlaz — kanonski `BookingReservation`, day-lock i
 * idempotencija dolaze u Slice 5 i koriste ovaj modul kao izvor činjenica.
 */
export type {
  AvailabilityBand,
  AvailabilityClass,
  AvailabilityQuery,
  AvailabilityResult,
  AvailabilitySlot,
  LocalDate,
  LocalTime,
  ManualSlot,
  Occupancy,
  TimeRange,
  VacationRange,
  WeekdayIndex,
} from "./types";

export {
  computeAvailability,
  findFirstAvailableDay,
  hasAnyAvailability,
} from "./availability";

export {
  addDays,
  endMinutesOf,
  localTimeExists,
  minutesToTime,
  timeToMinutes,
  weekdayOf,
  zonedParts,
  zonedTimeToUtc,
} from "./time";

export {
  normalize,
  overlaps,
  subtract,
  type MinuteInterval,
} from "./intervals";
