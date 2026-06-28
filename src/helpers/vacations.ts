/**
 * helpers/vacations.ts
 *
 * Utilities for salon vacations (godišnji odmor).
 * Each vacation is a date range stored as "YYYY-MM-DD" strings, which sort
 * lexicographically, so plain string comparison is enough for ordering.
 */

import type { IVacation } from "@/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize/validate a raw value into clean {from,to} vacation entries.
 * Drops malformed entries and swaps reversed ranges so `from <= to`.
 */
export function normalizeVacations(raw: unknown): IVacation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => {
      if (typeof v !== "object" || v === null) return null;
      const o = v as Record<string, unknown>;
      const from = String(o.from ?? "").trim();
      const to = String(o.to ?? "").trim();
      if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) return null;
      return from <= to ? { from, to } : { from: to, to: from };
    })
    .filter((v): v is IVacation => v !== null);
}

/** Današnji datum kao "YYYY-MM-DD" (lokalna vremenska zona). */
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Pick the vacation to advertise: the one currently active or the nearest
 * upcoming (end date today or later), earliest start first. null if none.
 */
export function getActiveOrUpcomingVacation(
  raw: unknown,
  today: string = todayISO(),
): IVacation | null {
  const list = normalizeVacations(raw)
    .filter((v) => v.to >= today)
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  return list[0] ?? null;
}

/** "2026-07-25" -> "25.07". */
export function formatVacationDay(iso: string): string {
  if (!ISO_DATE.test(iso)) return iso;
  const [, month, day] = iso.split("-");
  return `${day}.${month}`;
}

/** Opseg za badge, npr. "25.07 - 03.08". */
export function formatVacationRange(v: IVacation): string {
  return `${formatVacationDay(v.from)} - ${formatVacationDay(v.to)}`;
}
