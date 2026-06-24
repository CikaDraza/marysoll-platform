"use client";

/**
 * Time24Input — 24-hour time field (00:00–23:59).
 *
 * Replaces native <input type="time">, whose 12h/24h rendering depends on the
 * browser/OS locale (so "19:00" shows as "07:00 PM" on US-locale devices).
 * This is a plain text input, so it ALWAYS shows 24h, in every browser.
 *
 * - Value contract is unchanged: a "HH:MM" string (or "" when empty).
 * - A <datalist> offers 30-minute suggestions (dropdown), but any minute can
 *   still be typed.
 * - On blur the input is normalized: digits → "HH:MM", hours clamped 0–23,
 *   minutes 0–59. So "1900" becomes "19:00".
 */
import { useId } from "react";

const STEP_MINUTES = 30;

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += STEP_MINUTES) {
    const h = Math.floor(m / 60)
      .toString()
      .padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    out.push(`${h}:${mm}`);
  }
  return out;
})();

/** digits-only → clamped "HH:MM"; empty stays empty. */
export function normalizeTime24(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  const h =
    digits.length <= 2
      ? parseInt(digits, 10)
      : parseInt(digits.slice(0, 2), 10);
  const m = digits.length <= 2 ? 0 : parseInt(digits.slice(2), 10);
  if (Number.isNaN(h)) return "";
  const hh = Math.min(23, Math.max(0, h)).toString().padStart(2, "0");
  const mm = Math.min(59, Math.max(0, Number.isNaN(m) ? 0 : m))
    .toString()
    .padStart(2, "0");
  return `${hh}:${mm}`;
}

interface Time24InputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  "aria-label"?: string;
}

export function Time24Input({
  value,
  onChange,
  className,
  placeholder = "19:00",
  required,
  "aria-label": ariaLabel,
}: Time24InputProps) {
  const listId = useId();

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        list={listId}
        value={value}
        placeholder={placeholder}
        required={required}
        aria-label={ariaLabel}
        maxLength={5}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(normalizeTime24(e.target.value))}
        className={className}
      />
      <datalist id={listId}>
        {TIME_OPTIONS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </>
  );
}
