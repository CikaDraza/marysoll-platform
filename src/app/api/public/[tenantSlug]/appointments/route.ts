/**
 * GET /api/public/[tenantSlug]/appointments
 *
 * Public — no auth required.
 *
 * Vraća ISKLJUČIVO zauzeće: kada i koliko dugo. Bez imena, bez usluge, bez
 * cene — kalendaru za crtanje slobodnih termina ništa od toga ne treba, a
 * `services[].price` je ranije javno otkrivao koliko je koji termin naplaćen.
 *
 * Skup statusa se IZVODI iz canonical occupancy pravila. Ranije je ovde
 * stajala ručna lista `["appointment_approved", "pending"]`, pa
 * `appointment_rescheduled` nije bio zauzet u UI-ju iako ga server blokira —
 * klijent bi video slobodan slot i tek na potvrdi dobio „Termin je zauzet".
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { Appointment } from "@/models/Appointment";
import { requireCapability } from "@/lib/platform/capabilities-server";
import { BLOCKING_APPOINTMENT_STATUSES } from "@/lib/appointments/occupancy";

type Params = { params: Promise<{ tenantSlug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;
  try {
    await connectToDB();

    const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
    if (!tenant) {
      return NextResponse.json({ success: false, error: "Salon nije pronađen" }, { status: 404 });
    }
    const denied = await requireCapability(
      String((tenant as Record<string, unknown>)._id),
      "booking.services",
    );
    if (denied) return NextResponse.json([]);

    const appointments = await Appointment.find({
      tenantId: (tenant as Record<string, unknown>)._id,
      status: { $in: [...BLOCKING_APPOINTMENT_STATUSES] },
    })
      .select("date time duration")
      .lean();

    // Samo ono što kalendar crta: kada i koliko dugo.
    const serialized = appointments.map((a) => {
      const appt = a as Record<string, unknown>;
      return {
        _id: String(appt._id ?? ""),
        date: String(appt.date ?? ""),
        time: String(appt.time ?? ""),
        duration: Number(appt.duration ?? 60),
      };
    });

    return NextResponse.json(serialized);
  } catch (err) {
    console.error("GET /api/public/[tenantSlug]/appointments:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
