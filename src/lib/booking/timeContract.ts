import { minutesToTime, zonedParts } from "@panta/booking-engine";
import { BookingError } from "./errors";

export interface ValidatedInterval {
  startsAt: Date;
  endsAt: Date;
  localDate: string;
  localStart: string;
  durationMinutes: number;
}

export function validateInterval(
  startsAt: Date,
  endsAt: Date,
  timezone: string,
  expectedDurationMinutes?: number,
): ValidatedInterval {
  const startMs = startsAt.getTime();
  const endMs = endsAt.getTime();
  const durationMinutes = (endMs - startMs) / 60_000;
  if (
    !timezone ||
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    endMs <= startMs ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    (expectedDurationMinutes !== undefined && durationMinutes !== expectedDurationMinutes)
  ) {
    throw new BookingError("BOOKING_INVALID_INTERVAL", "Nevalidan booking interval");
  }

  let startParts: ReturnType<typeof zonedParts>;
  let endParts: ReturnType<typeof zonedParts>;
  try {
    startParts = zonedParts(startsAt, timezone);
    endParts = zonedParts(new Date(endMs - 1), timezone);
  } catch {
    throw new BookingError("BOOKING_INVALID_INTERVAL", "Nevalidna IANA vremenska zona");
  }
  if (startParts.date !== endParts.date) {
    throw new BookingError(
      "BOOKING_INVALID_INTERVAL",
      "Rezervacija ne sme prelaziti lokalnu ponoć",
    );
  }

  return {
    startsAt,
    endsAt,
    localDate: startParts.date,
    localStart: minutesToTime(startParts.minutes),
    durationMinutes,
  };
}
