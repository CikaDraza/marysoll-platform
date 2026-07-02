/**
 * helpers/manualSlots.ts
 *
 * Validacija i čišćenje ručnih termina (availabilityMode === "manualSlots").
 *
 * Struktura u bazi: { "YYYY-MM-DD": [{ time: "HH:mm", duration: number, serviceId?: string }] }
 * Termini su lokalni (Europe/Belgrade) "HH:mm" stringovi — bez UTC konverzije,
 * isto kao Appointment.date / Appointment.time u tradicionalnom toku.
 */

import { IManualSlot, ManualSlotsMap } from "@/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const DEFAULT_DURATION = 30;
const MIN_DURATION = 5;
const MAX_DURATION = 600;

/** Lokalni datum (ne UTC) u formatu "YYYY-MM-DD" — koristi se za odsecanje prošlih datuma. */
export function localTodayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

/** Ručni termini za jedan datum ("YYYY-MM-DD"), sortirani rastuće. */
export function manualTimesForDate(
  manualSlots: ManualSlotsMap | undefined,
  dateStr: string,
): IManualSlot[] {
  if (!manualSlots) return [];
  const list = manualSlots[dateStr];
  if (!Array.isArray(list)) return [];
  return [...list]
    .filter((s) => s && typeof s.time === "string")
    .sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
}

/**
 * Da li je termin [startMin, startMin+dur) zauzet nekim postojećim Appointment-om.
 * Isti half-open overlap kao u /api/slots i tradicionalnom toku.
 */
export function isManualSlotTaken(
  appointments: { date: string; time: string; duration?: number }[],
  dateStr: string,
  startMin: number,
  dur: number,
): boolean {
  const end = startMin + dur;
  return appointments.some((a) => {
    if (a.date !== dateStr) return false;
    const s = timeToMin(a.time);
    const e = s + (a.duration || 60);
    return startMin < e && end > s;
  });
}

export type ManualSlotCheck =
  | { ok: true; slot: IManualSlot }
  | { ok: false; reason: "not_defined" | "taken" };

/**
 * Server-side provera za availabilityMode === "manualSlots": traženi (date, time)
 * mora biti tačno jedan od definisanih ručnih termina i ne sme se preklapati
 * sa postojećim aktivnim Appointment-om. Frontend isto ograničava izbor, ali
 * je ovo poslednja linija odbrane ako zahtev stigne mimo UI-ja.
 */
export function checkManualSlotAvailability(
  manualSlots: ManualSlotsMap | undefined,
  appointments: { date: string; time: string; duration?: number }[],
  dateStr: string,
  time: string,
): ManualSlotCheck {
  const slot = manualTimesForDate(manualSlots, dateStr).find(
    (s) => s.time === time,
  );
  if (!slot) return { ok: false, reason: "not_defined" };
  if (isManualSlotTaken(appointments, dateStr, timeToMin(time), slot.duration)) {
    return { ok: false, reason: "taken" };
  }
  return { ok: true, slot };
}

/**
 * Normalizuje, validira i odseca prošle datume iz ručnih termina.
 * - odbacuje nevalidne datume ("YYYY-MM-DD") i datume pre `today`
 * - odbacuje nevalidne ("HH:mm") ili duple termine unutar istog datuma
 * - clamp-uje trajanje na [MIN_DURATION, MAX_DURATION], default DEFAULT_DURATION
 * - sortira termine rastuće i izbacuje datume bez termina
 */
export function pruneAndValidateManualSlots(
  input: unknown,
  today: string = localTodayStr(),
): ManualSlotsMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const out: ManualSlotsMap = {};

  for (const [date, value] of Object.entries(input as Record<string, unknown>)) {
    if (!DATE_RE.test(date) || date < today) continue;
    if (!Array.isArray(value)) continue;

    const seen = new Set<string>();
    const slots: IManualSlot[] = [];

    for (const raw of value) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      const time = String(r.time ?? "").trim();
      if (!TIME_RE.test(time) || seen.has(time)) continue;

      let duration =
        typeof r.duration === "number" ? Math.round(r.duration) : DEFAULT_DURATION;
      if (!Number.isFinite(duration) || duration < MIN_DURATION) duration = DEFAULT_DURATION;
      if (duration > MAX_DURATION) duration = MAX_DURATION;

      const slot: IManualSlot = { time, duration };
      const serviceId = typeof r.serviceId === "string" ? r.serviceId.trim() : "";
      if (serviceId) slot.serviceId = serviceId;

      seen.add(time);
      slots.push(slot);
    }

    if (slots.length === 0) continue;
    slots.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
    out[date] = slots;
  }

  return out;
}
