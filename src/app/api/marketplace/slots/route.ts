// GET /api/marketplace/slots?salonId=&serviceId=&date=YYYY-MM-DD&duration=
// Marketplace — available slots for a salon (no admin auth).
// Grana po availabilityMode:
//   - "workingHours": fiksni SLOT_INTERVAL korak unutar radnog vremena
//   - "manualSlots":  samo termini koje je vlasnik ručno definisao za taj datum
// slotDuration (veličina bloka) za "workingHours" režim: eksplicitni ?duration >
// max trajanje varijante (type:"variant") > service.duration > SLOT_INTERVAL.
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { verifySignature } from "@/lib/middleware/verifySignature";
import {
  availabilityForDate,
  type BookedAppointment,
  type SalonAvailabilityProfile,
} from "@/lib/booking/availabilityAdapter";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";
import { manualTimesForDate } from "@/helpers/manualSlots";

const SLOT_INTERVAL = 30;

/**
 * Veličina bloka slota za workingHours režim:
 *   eksplicitni ?duration  >  max trajanje varijante  >  service.duration  >  SLOT_INTERVAL
 * (Za variant usluge top-level `duration` obično ne postoji — zato max po varijantama.)
 */
async function resolveSlotDuration(
  serviceId: string | null,
  durationParam: string | null,
): Promise<number> {
  const explicit = Number(durationParam);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  if (!serviceId) return SLOT_INTERVAL;

  const svc = await Service.findById(serviceId).select("duration type variants").lean();
  if (!svc) return SLOT_INTERVAL;
  const sv = svc as Record<string, unknown>;

  if (sv.type === "variant" && Array.isArray(sv.variants)) {
    const durations = (sv.variants as { duration?: number }[])
      .map((v) => v.duration)
      .filter((d): d is number => typeof d === "number" && d > 0);
    if (durations.length > 0) return Math.max(...durations);
  }
  if (typeof sv.duration === "number" && sv.duration > 0) return sv.duration;
  return SLOT_INTERVAL;
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
      .select("tenantId workingHours availabilityMode manualSlots vacations")
      .lean();
    if (!salon) {
      return NextResponse.json({ error: "Salon nije pronađen" }, { status: 404 });
    }

    const s = salon as Record<string, unknown>;
    const tenantId = String(s.tenantId ?? "");
    const isManual = s.availabilityMode === "manualSlots";

    const booked = (await Appointment.find({
      tenantId,
      date,
      status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
    })
      .select("time duration status")
      .lean()) as unknown as { time?: string; duration?: number; status?: string }[];

    const appointments: BookedAppointment[] = booked.map((a) => ({
      date,
      time: String(a.time ?? "00:00"),
      ...(typeof a.duration === "number" ? { duration: a.duration } : {}),
      ...(a.status ? { status: a.status } : {}),
    }));

    const slotDuration = await resolveSlotDuration(serviceId, searchParams.get("duration"));

    const { slots } = availabilityForDate({
      tenantId,
      localDate: date,
      durationMinutes: slotDuration,
      stepMinutes: SLOT_INTERVAL,
      profile: s as SalonAvailabilityProfile,
      appointments,
      now: new Date(),
    });

    // Ručni termin sme da nosi unapred izabranu uslugu — to je podatak profila,
    // ne availability pojam, pa se vraća iz profila po vremenu početka.
    const manualById = new Map(
      manualTimesForDate(
        s.manualSlots as Record<string, { time: string; duration: number; serviceId?: string }[]>,
        date,
      ).map((slot) => [slot.time, slot]),
    );

    return NextResponse.json(
      slots.map((slot) => {
        const minutes = Math.round(
          (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000,
        );
        const out: Record<string, unknown> = {
          _id: `${salonId}_${date}_${slot.localStart}`,
          salonId,
          startTime: `${date}T${slot.localStart}:00`,
          endTime: `${date}T${slot.localEnd}:00`,
          isAvailable: true,
          duration: minutes,
        };
        const manual = isManual ? manualById.get(slot.localStart) : undefined;
        if (manual?.serviceId) out.serviceId = manual.serviceId;
        return out;
      }),
    );
  } catch (err) {
    console.error("[GET /api/marketplace/slots]", err);
    return NextResponse.json({ error: "Greška pri učitavanju termina" }, { status: 500 });
  }
}
