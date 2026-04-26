// GET /api/slots — proxy to platform API
import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/api/platformClient";
import { mapSlot } from "@/lib/mappers/salonMapper";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const salonId = searchParams.get("salonId");
    if (!salonId) {
      return NextResponse.json({ error: "salonId required" }, { status: 400 });
    }

    const serviceId = searchParams.get("serviceId") ?? undefined;
    const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

    const raw = await getAvailableSlots({ salonId, serviceId, date });
    return NextResponse.json(raw.map(mapSlot));
  } catch (err) {
    console.error("[GET /api/slots]", err);
    return NextResponse.json({ error: "Greška pri učitavanju termina" }, { status: 500 });
  }
}
