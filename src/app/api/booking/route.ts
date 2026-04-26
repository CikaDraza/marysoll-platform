// POST /api/booking — proxy to platform API
import { NextRequest, NextResponse } from "next/server";
import { createBooking, type PlatformBookingPayload } from "@/lib/api/platformClient";

export async function POST(req: NextRequest) {
  try {
    const payload: PlatformBookingPayload = await req.json();

    if (!payload.salonId || !payload.serviceId || !payload.startTime) {
      return NextResponse.json({ error: "salonId, serviceId i startTime su obavezni" }, { status: 400 });
    }

    if (!payload.user?.name || !payload.user?.phone) {
      return NextResponse.json({ error: "Ime i telefon su obavezni" }, { status: 400 });
    }

    const result = await createBooking(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/booking]", err);
    return NextResponse.json({ error: "Greška pri zakazivanju" }, { status: 500 });
  }
}
