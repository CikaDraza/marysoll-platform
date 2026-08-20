/**
 * Vreme sa zonom — bez ijedne zavisnosti, preko `Intl`.
 *
 * Zašto ne naivni `new Date("2026-03-29T02:30")`: takav parse koristi zonu
 * PROCESA. Na Vercelu je to UTC, a salon radi po Europe/Belgrade — pa je
 * „prošlo vreme" bilo pomereno za sat ili dva, a na DST dan i za ceo sat.
 *
 * Zona ulazi kao argument, nikad kao globalna pretpostavka.
 */

/** Minuti od ponoći za "HH:MM"; "24:00" → 1440. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/** "HH:MM" iz minuta; 1440 → "24:00" (kraj dana, ne ponoć sledećeg). */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Kraj radnog opsega zapisan kao "00:00" znači PONOĆ NA KRAJU dana, ne početak.
 * Bez ovoga bi opseg 21:00–00:00 bio prazan (end 0 < start 1260).
 */
export function endMinutesOf(time: string): number {
  const min = timeToMinutes(time);
  return min === 0 ? 1440 : min;
}

const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      // h23 — inače neki engine-i vrate "24" za ponoć i račun promaši dan.
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    FORMATTERS.set(timeZone, formatter);
  }
  return formatter;
}

/** Lokalni datum i minut u zoni, za dati instant. */
export function zonedParts(
  instant: Date,
  timeZone: string,
): { date: string; minutes: number } {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  const year = String(get("year")).padStart(4, "0");
  const month = String(get("month")).padStart(2, "0");
  const day = String(get("day")).padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    minutes: get("hour") * 60 + get("minute"),
  };
}

/** Pomak zone u odnosu na UTC, u milisekundama, U TOM TRENUTKU (ne uopšteno). */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  // Sekunde su dovoljna rezolucija; milisekunde bi ušle u razliku kao šum.
  const base = Math.floor(instant.getTime() / 1000) * 1000;
  const parts = formatterFor(timeZone).formatToParts(new Date(base));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asIfUtc - base;
}

/**
 * Lokalni dan + minut od ponoći → tačan UTC instant.
 *
 * Dva koraka fiksne tačke: prvi pomak je iz „naivnog" trenutka, drugi iz već
 * popravljenog. Tek drugi korak razlikuje DST dan od naivnih 24 sata — na dan
 * pomeranja se pomak menja usred dana, pa jedan prolaz promaši za sat.
 */
export function zonedTimeToUtc(
  date: string,
  minutes: number,
  timeZone: string,
): Date {
  const [y, m, d] = date.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d) + minutes * 60_000;
  let ts = naive - timeZoneOffsetMs(new Date(naive), timeZone);
  ts = naive - timeZoneOffsetMs(new Date(ts), timeZone);
  return new Date(ts);
}

/**
 * Da li lokalno vreme uopšte POSTOJI u toj zoni.
 *
 * Na prolećnom pomeranju sat nestaje (u Beogradu 02:00–03:00), pa termin u toj
 * rupi nema instant — ne sme se ponuditi. Provera je povratna: instant vraćen
 * u lokalno vreme mora dati isti dan i minut.
 */
export function localTimeExists(
  date: string,
  minutes: number,
  timeZone: string,
): boolean {
  const instant = zonedTimeToUtc(date, minutes, timeZone);
  const back = zonedParts(instant, timeZone);
  const expectedDate =
    minutes >= 1440
      ? zonedParts(
          new Date(zonedTimeToUtc(date, 0, timeZone).getTime() + 86_400_000),
          timeZone,
        ).date
      : date;
  return back.minutes === minutes % 1440 && back.date === expectedDate;
}

/** Kalendarski dan u nedelji za "YYYY-MM-DD" — nezavisan od zone. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Pomera "YYYY-MM-DD" za `days` dana (kalendarski, bez zone). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const moved = new Date(Date.UTC(y, m - 1, d + days));
  return moved.toISOString().slice(0, 10);
}
