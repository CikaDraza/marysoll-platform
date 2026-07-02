// Zajednički helperi za rad sa "YYYY-MM-DD" + "HH:MM" vrednostima termina
// koje aplikacija interpretira u Europe/Belgrade vremenskoj zoni.

/** YYYY-MM-DD u Europe/Belgrade vremenskoj zoni. */
export function belgradeDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Interpretira "YYYY-MM-DD" + "HH:MM" kao Europe/Belgrade i vraća tačan UTC Date. */
export function belgradeToUTC(dateStr: string, timeStr: string): Date {
  const midnight = new Date(`${dateStr}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(midnight);
  const bH = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
  const bM = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
  const offsetMin = (bH % 24) * 60 + bM;
  const [tH, tM] = timeStr.split(":").map(Number);
  const utcMin = tH * 60 + tM - offsetMin;
  const result = new Date(`${dateStr}T00:00:00Z`);
  result.setUTCMinutes(result.getUTCMinutes() + utcMin);
  return result;
}

/** UTC Date kraja termina: početak (Belgrade) + trajanje u minutima. */
export function appointmentEndUTC(
  dateStr: string,
  timeStr: string,
  durationMin: number,
): Date {
  const start = belgradeToUTC(dateStr, timeStr);
  return new Date(start.getTime() + (durationMin || 0) * 60_000);
}
