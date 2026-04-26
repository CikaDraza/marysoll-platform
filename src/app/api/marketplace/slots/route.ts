// GET /api/marketplace/slots?salonId=&serviceId=&date=YYYY-MM-DD
// Marketplace — available slots for a salon (no admin auth)
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";

const SLOT_INTERVAL = 30;

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function minToTime(min: number): string {
  return `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`;
}

function dateToDayKey(dateStr: string): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date(dateStr).getDay()];
}

function parseWorkingHours(wh: unknown, dayKey: string): { from: string; to: string } | null {
  if (!wh || typeof wh !== "object") return null;
  const daySlots = (wh as Record<string, unknown>)[dayKey];
  if (!daySlots) return null;
  if (Array.isArray(daySlots) && daySlots.length > 0) {
    const s = daySlots[0] as { from?: string; to?: string };
    if (s.from && s.to) return { from: s.from, to: s.to };
  }
  if (typeof daySlots === "string") {
    const parts = daySlots.split(" - ");
    if (parts.length === 2) return { from: parts[0].trim(), to: parts[1].trim() };
  }
  return null;
}

export async function GET(req: NextRequest) {
  const verify = verifySignature(req, "");
  if (!verify.ok) {
    return NextResponse.json({ error: verify.error }, { status: verify.status });
  }

  const apiKey = req.headers.get("x-api-key") ?? "dev";
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ error: "Previše zahteva" }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const salonId = searchParams.get("salonId");
  if (!salonId) {
    return NextResponse.json({ error: "salonId je obavezan" }, { status: 400 });
  }

  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  try {
    await connectToDB();

    const salon = await SalonProfile.findById(salonId)
      .select("tenantId workingHours")
      .lean();
    if (!salon) {
      return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
    }

    const s = salon as Record<string, unknown>;
    const tenantId = String(s.tenantId ?? "");
    const hours = parseWorkingHours(s.workingHours, dateToDayKey(date));
    if (!hours) return NextResponse.json([]);

    let slotDuration = SLOT_INTERVAL;
    if (serviceId) {
      const svc = await Service.findById(serviceId).select("duration").lean();
      if (svc) {
        const sv = svc as Record<string, unknown>;
        if (typeof sv.duration === "number") slotDuration = sv.duration;
      }
    }

    const booked = await Appointment.find({
      tenantId,
      date,
      status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
    })
      .select("time duration")
      .lean();

    const bookedRanges = booked.map((a) => {
      const appt = a as Record<string, unknown>;
      const start = timeToMin(String(appt.time ?? "00:00"));
      const dur = typeof appt.duration === "number" ? appt.duration : 60;
      return { start, end: start + dur };
    });

    const startMin = timeToMin(hours.from);
    const endMin = timeToMin(hours.to);
    const slots: {
      _id: string;
      salonId: string;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }[] = [];

    for (let t = startMin; t + slotDuration <= endMin; t += SLOT_INTERVAL) {
      const slotEnd = t + slotDuration;
      const taken = bookedRanges.some((b) => t < b.end && slotEnd > b.start);
      if (!taken) {
        slots.push({
          _id: `${salonId}_${date}_${minToTime(t)}`,
          salonId,
          startTime: `${date}T${minToTime(t)}:00`,
          endTime: `${date}T${minToTime(slotEnd)}:00`,
          isAvailable: true,
        });
      }
    }

    return NextResponse.json(slots);
  } catch (err) {
    console.error("[GET /api/marketplace/slots]", err);
    return NextResponse.json({ error: "Greška pri učitavanju termina" }, { status: 500 });
  }
}
