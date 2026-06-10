// helpers/serviceDuration.ts
//
// Resolves the duration to show for a service on the public "/usluge" page.
//
//  - "single" → the service's own `duration`            → "45 minuta"
//  - "variant" → the LONGEST variant duration            → "do 120 minuta"
//                (variants like "Izlivanje 5 / 6+" run longer than 1 / 2, so a
//                 single number is misleading; we show the upper bound. When
//                 every variant is the same length we drop the "do" prefix.)
//  - "group"  → service `duration` if set, else the sum of its items
//
// `variant`/`group` services don't carry a top-level `duration`, which is why
// the page previously rendered a blank "Trajanje:  minuta" for them.

import type { IService } from "@/types";

export interface ServiceDuration {
  /** Numeric minutes (max for variants) — for the <time dateTime> attribute. */
  minutes: number | null;
  /** Display label, e.g. "45 minuta" or "do 120 minuta". null when unknown. */
  text: string | null;
}

function positiveDurations(values: Array<number | undefined>): number[] {
  return values.filter((d): d is number => typeof d === "number" && d > 0);
}

export function getServiceDuration(service: IService): ServiceDuration {
  if (service.type === "variant") {
    const durations = positiveDurations(
      (service.variants ?? []).map((v) => v.duration),
    );
    if (durations.length > 0) {
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      return {
        minutes: max,
        text: min === max ? `${max} minuta` : `do ${max} minuta`,
      };
    }
  }

  if (service.type === "group" && !(service.duration && service.duration > 0)) {
    const sum = positiveDurations(
      (service.services ?? []).map((s) => s.duration),
    ).reduce((a, b) => a + b, 0);
    if (sum > 0) return { minutes: sum, text: `${sum} minuta` };
  }

  // single (and any fallback when variant/group data is missing)
  if (service.duration && service.duration > 0) {
    return { minutes: service.duration, text: `${service.duration} minuta` };
  }

  return { minutes: null, text: null };
}
