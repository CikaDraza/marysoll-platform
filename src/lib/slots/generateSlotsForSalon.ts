import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Slot } from "@/models/Slot";
import { parseDaySlots } from "@/helpers/parseWorkingHours";
import { Types } from "mongoose";

const SLOT_DURATION_MIN = 30;

// Serbian day names indexed by JS getDay() (0=Sunday)
const JS_DAY_TO_SERBIAN = [
  "Nedelja",
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
];

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

// Interprets HH:MM as Europe/Belgrade local time and returns the correct UTC Date.
// Without this, `new Date("2026-04-30T08:00:00")` on a UTC server stores 08:00Z
// which displays as 10:00 in Belgrade (UTC+2 offset applied at display time).
function belgradToUTC(dateStr: string, timeStr: string): Date {
  const midnight = new Date(`${dateStr}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Belgrade",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(midnight);
  const bH = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
  const bM = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
  const offsetMin = (bH % 24) * 60 + bM; // offset from UTC (e.g. 120 for CEST)
  const [tH, tM] = timeStr.split(":").map(Number);
  const utcMin = tH * 60 + tM - offsetMin;
  const result = new Date(`${dateStr}T00:00:00Z`);
  result.setUTCMinutes(result.getUTCMinutes() + utcMin);
  return result;
}

/**
 * Returns working hour slots for a given date from a salon's workingHours value.
 * Handles three formats:
 *   - ISO array:   [{ day: 1–7, start: "09:00", end: "17:00" }]  (1=Mon, 7=Sun)
 *   - Named array: { "Ponedeljak": [{ from: "09:00", to: "17:00" }] }
 *   - Named string: { "Ponedeljak": "09:00 - 17:00" }
 */
function getHoursForDate(
  workingHours: unknown,
  date: Date,
): { from: string; to: string }[] {
  if (!workingHours) return [];

  const jsDay = date.getDay(); // 0=Sun … 6=Sat

  // ISO numeric array format
  if (Array.isArray(workingHours)) {
    const entry = (workingHours as Record<string, unknown>[]).find((e) => {
      const isoDay = typeof e?.day === "number" ? e.day : -1;
      const mapped = isoDay === 7 ? 0 : isoDay; // ISO 7 (Sun) → JS 0
      return mapped === jsDay;
    });
    if (!entry) return [];
    const from = String(entry.start ?? "").trim();
    const to = String(entry.end ?? "").trim();
    return from && to ? [{ from, to }] : [];
  }

  // Serbian-named object format (legacy string or new array value)
  if (typeof workingHours === "object") {
    const dayName = JS_DAY_TO_SERBIAN[jsDay];
    const value = (workingHours as Record<string, unknown>)[dayName];
    return parseDaySlots(value);
  }

  return [];
}

function buildSlotsForDay(
  salonId: Types.ObjectId,
  date: Date,
  hours: { from: string; to: string }[],
): { salonId: Types.ObjectId; startTime: Date; endTime: Date; status: "free" }[] {
  const slots: {
    salonId: Types.ObjectId;
    startTime: Date;
    endTime: Date;
    status: "free";
  }[] = [];

  // Use local date string to avoid UTC offset shifting the day
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${mo}-${d}`;

  for (const { from, to } of hours) {
    const startMin = timeToMin(from);
    const endMin = timeToMin(to);

    for (let t = startMin; t + SLOT_DURATION_MIN <= endMin; t += SLOT_DURATION_MIN) {
      const h = Math.floor(t / 60).toString().padStart(2, "0");
      const m = (t % 60).toString().padStart(2, "0");
      const start = belgradToUTC(dateStr, `${h}:${m}`);
      const end = addMinutes(start, SLOT_DURATION_MIN);
      slots.push({ salonId, startTime: start, endTime: end, status: "free" });
    }
  }

  return slots;
}

/**
 * Generates free slots for a single salon for the next `daysAhead` days.
 * Skips slots that already exist (unique index on salonId + startTime).
 * Returns the number of new slots inserted.
 */
export async function generateSlotsForSalon(
  salonId: string,
  daysAhead = 14,
): Promise<number> {
  await connectToDB();

  const salon = await SalonProfile.findById(salonId)
    .select("workingHours")
    .lean();
  if (!salon) throw new Error(`Salon ${salonId} not found`);

  const workingHours = (salon as Record<string, unknown>).workingHours;
  const oid = new Types.ObjectId(salonId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toInsert: {
    salonId: Types.ObjectId;
    startTime: Date;
    endTime: Date;
    status: "free";
  }[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const hours = getHoursForDate(workingHours, date);
    const daySlots = buildSlotsForDay(oid, date, hours);
    toInsert.push(...daySlots);
  }

  if (toInsert.length === 0) return 0;

  // ordered: false → unique index violations (duplicates) are skipped silently
  const result = await Slot.insertMany(toInsert, { ordered: false }).catch(
    (err) => {
      // BulkWriteError with code 11000 = duplicate keys — that's expected
      if (err?.code === 11000 || err?.writeErrors?.length > 0) {
        return err.insertedDocs ?? [];
      }
      throw err;
    },
  );

  return Array.isArray(result) ? result.length : 0;
}

/**
 * Daily rolling job — generates missing slots for all active salons.
 * Safe to run repeatedly; duplicates are skipped via unique index.
 */
export async function rollSlotsForward(daysAhead = 14): Promise<void> {
  await connectToDB();

  const salons = await SalonProfile.find({ isDemo: { $ne: true } })
    .select("_id")
    .lean();

  for (const salon of salons) {
    const id = String((salon as Record<string, unknown>)._id);
    try {
      const inserted = await generateSlotsForSalon(id, daysAhead);
      console.log(`[slots] salon=${id} inserted=${inserted}`);
    } catch (err) {
      console.error(`[slots] salon=${id} error:`, err);
    }
  }
}
