// GET /api/slots?salonId=...&serviceId=...&date=YYYY-MM-DD — HMAC-signed
//
// Dostupnost se od Slice 3 računa u `@panta/booking-engine` kroz adapter; ruta
// samo dovlači podatke i oblikuje odgovor. Ranije je imala svoju kopiju pravila
// i dva buga zbog kojih praktično NIKAD nije vraćala termine:
//   · dan je tražila kao "monday", a profil ga drži kao "Ponedeljak" → uvek [];
//   · uzimala je samo PRVI opseg dana, pa je popodne posle pauze nestajalo.
// Odmori (`vacations`) se sada takođe poštuju — ranije se nisu gledali nigde.
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Appointment } from "@/models/Appointment";
import { Service } from "@/models/Service";
import { verifySignature } from "@/lib/middleware/verifySignature";
import { checkRateLimit } from "@/lib/middleware/rateLimiter";
import {
  availabilityForDate,
  type BookedAppointment,
  type SalonAvailabilityProfile,
} from "@/lib/booking/availabilityAdapter";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { ACTIVE_APPOINTMENT_STATUS_FILTER } from "@/lib/appointments/occupancy";

const SLOT_INTERVAL = 30;

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
    const denied = await requireCapability(String(s.tenantId ?? ""), "booking.services");
    if (denied) return NextResponse.json([]);

    let slotDuration = SLOT_INTERVAL;
    if (serviceId) {
      const svc = await Service.findById(serviceId).select("duration").lean();
      const sv = (svc ?? {}) as Record<string, unknown>;
      if (typeof sv.duration === "number") slotDuration = sv.duration;
    }

    // Status filter ostaje i u upitu (manje dokumenata), a adapter ga ponavlja
    // kao poslednju liniju — zauzetost je jedina stvar koju ne smemo promašiti.
    const booked = (await Appointment.find({
      tenantId: s.tenantId,
      date,
      status: ACTIVE_APPOINTMENT_STATUS_FILTER,
    })
      .select("time duration status")
      .lean()) as unknown as { time?: string; duration?: number; status?: string }[];

    const appointments: BookedAppointment[] = booked.map((a) => ({
      date,
      time: String(a.time ?? "00:00"),
      ...(typeof a.duration === "number" ? { duration: a.duration } : {}),
      ...(a.status ? { status: a.status } : {}),
    }));

    const { slots } = availabilityForDate({
      tenantId: String(s.tenantId ?? ""),
      localDate: date,
      durationMinutes: slotDuration,
      stepMinutes: SLOT_INTERVAL,
      profile: s as SalonAvailabilityProfile,
      appointments,
      now: new Date(),
    });

    return NextResponse.json(
      slots.map((slot) => ({
        _id: `${salonId}_${date}_${slot.localStart}`,
        salonId,
        startTime: `${date}T${slot.localStart}:00`,
        endTime: `${date}T${slot.localEnd}:00`,
        isAvailable: true,
      })),
    );
  } catch (err) {
    console.error("[GET /api/slots]", err);
    return NextResponse.json({ error: "Greška pri učitavanju termina" }, { status: 500 });
  }
}
